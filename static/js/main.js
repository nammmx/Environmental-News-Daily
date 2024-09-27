document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const articlesPerPage = 20;

    // DOM elements
    const dateSelect = document.getElementById('date-select');
    const keywordInput = document.getElementById('keyword-input');
    const articlesContainer = document.getElementById('articles-container');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');
    let selectedTopic = 'all';
    const topicNavbar = document.querySelector('.topic-navbar');
    const topicItems = document.querySelectorAll('.topic-item');

    // Detect if flexbox wrapping occurs
    function checkFlexWrap() {
        const initialHeight = topicNavbar.clientHeight;
        topicNavbar.style.flexWrap = 'nowrap';
        const singleLineHeight = topicNavbar.clientHeight;
        topicNavbar.style.flexWrap = ''; // Reset back to normal

        if (initialHeight > singleLineHeight) {
            // If wrapping occurs, set smaller padding
            topicItems.forEach(item => {
                item.style.padding = '10px 14px';
            });
        } else {
            // If no wrapping, set default padding
            topicItems.forEach(item => {
                item.style.padding = '20px 14px';
            });
        }
    }

    // Fetch and display articles
    function fetchArticles(page = 1) {
        const date = dateSelect.value;
        const keyword = keywordInput.value;

        const params = new URLSearchParams({
            date: date,
            topic: selectedTopic,
            keyword: keyword,
            page: page
        });

        fetch(`/get_articles?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                renderArticles(data.articles);
                updatePagination(data.current_page, data.total_pages);
                window.scrollTo(0, 0);  // Scroll to top
            });
    }

    // Render articles
    function renderArticles(articles) {
        articlesContainer.innerHTML = '';
        if (articles.length === 0) {
            articlesContainer.innerHTML = '<p>No articles found.</p>';
            return;
        }

        articles.forEach(article => {
            const articleDiv = createArticleElement(article);
            articlesContainer.appendChild(articleDiv);
        });
    }

    // Create an article element with image, title, buttons, and date
    function createArticleElement(article) {
        const articleDiv = document.createElement('div');
        articleDiv.className = 'article';

        articleDiv.innerHTML = `
            <div class="article-image">
                <img src="${article.image}" alt="${article.title}">
            </div>
            <h2 class="article-title">${article.title}</h2>
            <div class="article-buttons">
                <button class="btn-summary" data-id="${article.news_id}">Read Summary</button>
                <button class="btn-article" onclick="window.open('${article.link}', '_blank')">Read Whole Article</button>
            </div>
            <p class="article-summary" id="summary-${article.news_id}" style="display: none;">${article.summary}</p>
            <p class="article-date">${formatDate(article.date_created)}</p>
        `;

        return articleDiv;
    }

    // Toggle summary visibility
    articlesContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-summary')) {
            const articleId = e.target.getAttribute('data-id');
            const summaryElement = document.getElementById(`summary-${articleId}`);
            const isVisible = summaryElement.style.display === 'block';

            if (isVisible) {
                summaryElement.style.display = 'none';
                e.target.textContent = 'Read Summary';
            } else {
                summaryElement.style.display = 'block';
                e.target.textContent = 'Hide Summary';
            }
        }
    });

    // Pagination
    function updatePagination(current, total) {
        prevPageBtn.disabled = current <= 1;
        nextPageBtn.disabled = current >= total;

        prevPageBtn.onclick = () => {
            if (current > 1) fetchArticles(--current);
        };
        nextPageBtn.onclick = () => {
            if (current < total) fetchArticles(++current);
        };

        pageNumbersContainer.innerHTML = `Page ${current} of ${total}`;
    }

    // Helper function to format dates
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Event listeners for navbar topics
    topicItems.forEach(item => {
        item.addEventListener('click', function() {
            selectedTopic = this.getAttribute('data-topic');

            // Remove selected class from all topics
            topicItems.forEach(topic => topic.classList.remove('selected-topic'));

            // Add selected class to the clicked topic
            this.classList.add('selected-topic');

            // Fetch articles for the selected topic
            fetchArticles(1);
        });
    });

    // Event listeners for date and keyword
    dateSelect.addEventListener('change', () => fetchArticles(1));
    keywordInput.addEventListener('input', () => fetchArticles(1));

    // Initial fetch
    fetchArticles();

    // Call the function to check for flex wrap and adjust padding
    checkFlexWrap();

    // Check for window resize to recalculate wrapping
    window.addEventListener('resize', checkFlexWrap);
});