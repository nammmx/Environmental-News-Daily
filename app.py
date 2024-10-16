from flask import Flask, render_template, request, jsonify
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
import os
from flask_caching import Cache
import boto3
import re
from collections import Counter

app = Flask(__name__)

# Configure caching
cache = Cache(config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 3600})  # Cache timeout in seconds (30 mins)
cache.init_app(app)

# Load environment variables
load_dotenv()

# S3 configurations
S3_BUCKET = 'state-of-the-earth'
CSV_KEY = '4_final/final_data_for_flask.csv'
WORDCLOUD_CSV_KEY = 'wordcloud/wordcloud_data_cleaned.csv'

# Initialize S3 client
s3_client = boto3.client('s3')

# Load the entire dataset into memory (cached) from S3 CSV
@cache.cached(timeout=3600, key_prefix='data_in_memory')
def load_data():
    # Download the CSV file from S3
    csv_obj = s3_client.get_object(Bucket=S3_BUCKET, Key=CSV_KEY)
    data_in_memory = pd.read_csv(csv_obj['Body'])
    
    # Ensure the publish_date column is a datetime object
    data_in_memory['publish_date'] = pd.to_datetime(data_in_memory['publish_date'])
    
    return data_in_memory

# Load word cloud data from S3
@cache.cached(timeout=3600, key_prefix='wordcloud_data')
def load_wordcloud_data():
    csv_obj = s3_client.get_object(Bucket=S3_BUCKET, Key=WORDCLOUD_CSV_KEY)
    wordcloud_data = pd.read_csv(csv_obj['Body'])
    return wordcloud_data

# Custom filter for date formatting
@app.template_filter('format_date')
def format_date(value, format='%B %d, %Y'):
    if isinstance(value, str):
        value = datetime.strptime(value, '%Y-%m-%d')
    return value.strftime(format)

@app.route('/')
def index():
    # Topics for filtering
    topics = [
        "Agriculture & Food", "Business & Innovation", "Climate Change", 
        "Crisis & Disasters", "Energy", "Fossil Fuels", "Pollution", 
        "Politics & Law", "Public Health & Environment", "Society & Culture", 
        "Sustainability", "Technology & Science", "Urban & Infrastructure", 
        "Water & Oceans", "Wildlife & Conservation"
    ]
    
    # Sources for filtering
    sources = [
        "BBC News", "Columbia Climate School", "Earth911", "Greenpeace", 
        "Grist", "The Guardian", "The Independent", "Yale Environment 360"
    ]
    
    return render_template('index.html', topics=topics, sources=sources)

# Word Cloud page route
@app.route('/wordcloud')
def wordcloud():
    return render_template('wordcloud.html')

# Function to generate word frequencies
def generate_word_frequencies(source=None, topic=None):
    # Load the word cloud data
    wordcloud_data = load_wordcloud_data()
    
    # Filter by source and topic if provided
    filtered_data = wordcloud_data.copy()
    if source:
        filtered_data = filtered_data[filtered_data["source"] == source]
    if topic:
        filtered_data = filtered_data[(filtered_data["topic1"] == topic) | (filtered_data["topic2"] == topic)]

    # Combine all cleaned content into a single string
    text = " ".join(filtered_data["cleaned_content"].dropna().astype(str)).lower()
    
    # Use regex to split by words and count frequencies
    words = re.findall(r'\b\w+\b', text)
    word_counts = Counter(words)

    # Limit to top N most frequent words
    TOP_N_WORDS = 250
    most_common_words = word_counts.most_common(TOP_N_WORDS)

    # Convert to a list of dictionaries for JSON output
    word_frequencies = [{"text": word, "size": count} for word, count in most_common_words if count > 1]

    return word_frequencies

# Endpoint to provide word frequency data with filters
@app.route('/data')
def data_endpoint():
    source = request.args.get('source')
    topic = request.args.get('topic')
    
    word_frequencies = generate_word_frequencies(source, topic)
    return jsonify(word_frequencies)

# Endpoint for unique values for dropdowns
@app.route('/filter-options')
def filter_options():
    wordcloud_data = load_wordcloud_data()
    sources = wordcloud_data["source"].dropna().unique().tolist()
    topics = pd.concat([wordcloud_data["topic1"], wordcloud_data["topic2"]]).dropna().unique().tolist()
    return jsonify({"sources": sources, "topics": topics})

# Endpoint to display articles containing a specific word
@app.route('/articles')
def articles():
    word = request.args.get("word", "")
    wordcloud_data = load_wordcloud_data()
    filtered_data = wordcloud_data[wordcloud_data["summary"].str.contains(rf'\b{word}\b', case=False, na=False)]
    
    # Convert filtered data to a list of dictionaries for display
    articles = filtered_data.to_dict(orient="records")
    return render_template("articles.html", word=word, articles=articles)

@app.route('/get_articles')
def get_articles():
    data_in_memory = load_data()  # Use cached data
    selected_topic = request.args.get('topic')
    selected_source = request.args.get('source')
    keyword = request.args.get('keyword', '')
    start_date = request.args.get('start_date')  # Get start_date parameter
    end_date = request.args.get('end_date')      # Get end_date parameter
    page = int(request.args.get('page', 1))
    articles_per_page = 21

    # Filter the data in memory
    filtered_data = data_in_memory.copy()
    
    # Filter by topic if not "all"
    if selected_topic and selected_topic != 'all':
        # Ensure case-insensitive matching for topics
        filtered_data = filtered_data[
            (filtered_data['topic1'].str.lower() == selected_topic.lower()) | 
            (filtered_data['topic2'].str.lower() == selected_topic.lower())
        ]

    # Filter by source if not "all"
    if selected_source and selected_source != 'all':
        filtered_data = filtered_data[filtered_data['source'].str.lower() == selected_source.lower()]

    # Filter by keyword if provided
    if keyword:
        filtered_data = filtered_data[
            filtered_data['title'].str.contains(keyword, case=False) |
            filtered_data['content'].str.contains(keyword, case=False)
        ]

    # Filter by date range if provided
    if start_date and end_date:
        try:
            # Convert string dates to datetime objects
            start_date_dt = datetime.strptime(start_date, '%Y-%m-%d')
            end_date_dt = datetime.strptime(end_date, '%Y-%m-%d')
            # Filter based on publish_date within the range (inclusive)
            filtered_data = filtered_data[
                (filtered_data['publish_date'] >= start_date_dt) &
                (filtered_data['publish_date'] <= end_date_dt)
            ]
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    # Calculate pagination
    total_articles = len(filtered_data)
    start = (page - 1) * articles_per_page
    end = start + articles_per_page
    total_pages = (total_articles + articles_per_page - 1) // articles_per_page

    # Paginate the filtered data
    paginated_data = filtered_data.iloc[start:end]
    
    # Convert filtered data to dictionary for JSON response
    articles = paginated_data.to_dict('records')
    
    return jsonify({
        'articles': articles,
        'total_pages': total_pages,
        'current_page': page
    })

# Route to refresh the in-memory dataset
@app.route('/refresh_data')
def refresh_data():
    cache.clear()  # Clear all cache
    load_data()  # Reload and cache the data
    return "Data refreshed", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)