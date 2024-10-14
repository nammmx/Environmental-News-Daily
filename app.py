from flask import Flask, render_template, request, jsonify
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
import os
from flask_caching import Cache
import boto3

app = Flask(__name__)

# Configure caching
cache = Cache(config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 3600})  # Cache timeout in seconds (30 mins)
cache.init_app(app)

# Load environment variables
load_dotenv()

# S3 configurations
S3_BUCKET = 'state-of-the-earth'
CSV_KEY = '4_final/final_data_for_flask.csv'

# Initialize S3 client
s3_client = boto3.client('s3')

# Load the entire dataset into memory (cached) from S3 CSV
@cache.cached(timeout=3600, key_prefix='data_in_memory')  # Cache this function for 30 minutes
def load_data():
    # Download the CSV file from S3
    csv_obj = s3_client.get_object(Bucket=S3_BUCKET, Key=CSV_KEY)
    data_in_memory = pd.read_csv(csv_obj['Body'])
    
    # Ensure the publish_date column is a datetime object
    data_in_memory['publish_date'] = pd.to_datetime(data_in_memory['publish_date'])
    
    return data_in_memory

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

@app.route('/get_articles')
def get_articles():
    data_in_memory = load_data()  # Use cached data
    selected_topic = request.args.get('topic')
    selected_source = request.args.get('source')
    keyword = request.args.get('keyword', '')
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
            filtered_data['summary'].str.contains(keyword, case=False)
        ]

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