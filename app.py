from flask import Flask, render_template, request, jsonify
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime, date
import config

app = Flask(__name__)

# Database connection setup
db_url = f"postgresql://{config.DB_USER}:{config.DB_PASSWORD}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_DATABASE}"
# db_url = f"redshift+psycopg2://{config.REDSHIFT_USER}:{config.REDSHIFT_PASSWORD}@{config.REDSHIFT_HOST}:{config.REDSHIFT_PORT}/{config.REDSHIFT_DBNAME}"
engine = create_engine(db_url)

# Load the entire dataset into memory
data_in_memory = None

def load_data():
    global data_in_memory
    query = """
        SELECT news_id, date_created, title, topic, summary, link, image, topic_2, source
        FROM news
        WHERE article != '' AND image != ''
    """
    with engine.connect() as connection:
        result = connection.execute(text(query))
        data_in_memory = pd.DataFrame(result.fetchall(), columns=result.keys())
        data_in_memory['date_created'] = pd.to_datetime(data_in_memory['date_created'])  # Ensure date column is datetime

# Load data initially
load_data()

# Custom filter for date formatting
@app.template_filter('format_date')
def format_date(value, format='%B %d, %Y'):
    if isinstance(value, str):
        value = datetime.strptime(value, '%Y-%m-%d')
    return value.strftime(format)

@app.route('/')
def index():
    # Date range setup
    min_date = date(2024, 8, 25)  # Adjust as necessary
    max_date = date.today()
    date_list = pd.date_range(min_date, max_date, freq='d').tolist()
    date_options = [d.strftime("%Y-%m-%d") for d in reversed(date_list)]
    
    # Topics for filtering
    topics = ["Business & Innovation", "Climate Change", "Crisis", "Energy", "Fossil Fuel",
              "Lifestyle", "Politics & Law", "Pollution", "Society", "Water", "Wildlife & Conservation"]
    
    return render_template('index.html', date_options=date_options, topics=topics)

@app.route('/get_articles')
def get_articles():
    global data_in_memory
    selected_date = request.args.get('date')
    selected_topic = request.args.get('topic')
    keyword = request.args.get('keyword', '')
    page = int(request.args.get('page', 1))
    articles_per_page = 20

    # Filter the data in memory
    filtered_data = data_in_memory.copy()
    
    # Filter by date if not "all"
    if selected_date and selected_date != 'all':
        filtered_data = filtered_data[filtered_data['date_created'].dt.date == pd.to_datetime(selected_date).date()]
    
    # Filter by topic if not "all"
    if selected_topic and selected_topic != 'all':
        filtered_data = filtered_data[(filtered_data['topic'] == selected_topic) | 
                                      (filtered_data['topic_2'] == selected_topic)]

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
    load_data()
    return "Data refreshed", 200

if __name__ == '__main__':
    app.run(debug=True)