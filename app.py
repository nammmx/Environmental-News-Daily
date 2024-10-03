from flask import Flask, render_template, request, jsonify
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime
from dotenv import load_dotenv
import os
from flask_caching import Cache

app = Flask(__name__)

# Configure caching
cache = Cache(config={'CACHE_TYPE': 'SimpleCache', 'CACHE_DEFAULT_TIMEOUT': 1800})  # Cache timeout in seconds (10 mins)
cache.init_app(app)

# Database connection setup
load_dotenv()

db_url = (
    f"redshift+psycopg2://{os.getenv('REDSHIFT_USER')}:{os.getenv('REDSHIFT_PASSWORD')}"
    f"@{os.getenv('REDSHIFT_HOST')}:{os.getenv('REDSHIFT_PORT')}/{os.getenv('REDSHIFT_DBNAME')}"
)
engine = create_engine(db_url)

# Load the entire dataset into memory (cached)
@cache.cached(timeout=1800, key_prefix='data_in_memory')  # Cache this function for 10 minutes
def load_data():
    query = """
        SELECT publish_date, title, topic1, summary, link, image, topic2, source
        FROM ingestion.news_articles
        WHERE content != '' AND image != ''
        ORDER BY publish_date DESC
    """
    with engine.connect() as connection:
        result = connection.execute(text(query))
        data_in_memory = pd.DataFrame(result.fetchall(), columns=result.keys())
        data_in_memory['publish_date'] = pd.to_datetime(data_in_memory['publish_date'])  # Ensure date column is datetime
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
    
    return render_template('index.html', topics=topics)

@app.route('/get_articles')
def get_articles():
    data_in_memory = load_data()  # Use cached data
    selected_topic = request.args.get('topic')
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
    cache.delete('data_in_memory')  # Clear the cached data
    load_data()  # Reload the data and cache it
    return "Data refreshed", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)