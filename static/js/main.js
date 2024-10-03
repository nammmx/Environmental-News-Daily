document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const articlesPerPage = 21;

    // DOM elements
    const keywordInput = document.getElementById('keyword-input');
    const articlesContainer = document.getElementById('articles-container');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');
    let selectedTopic = 'all'; // Initialize with default topic
    const topicItems = document.querySelectorAll('.side-menu .topic-item');


    // Source image mapping
    const sourceImageMapping = {
        "BBC News": "bbc.png",
        "Columbia Climate School": "columbia.png",
        "Earth911": "earth911.png",
        "Greenpeace": "greenpeace.png",
        "Grist": "grist.png",
        "The Guardian": "guardian.png",
        "The Independent": "independent.png",
        "Yale Environment 360": "yale.png"
    };

    // Helper function to format dates
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Fetch and display articles with smooth transition
    function fetchArticles(page = 1) {
        const keyword = keywordInput.value;

        const params = new URLSearchParams({
            topic: selectedTopic,
            keyword: keyword,
            page: page
        });

        // Fade out current articles before loading new ones
        articlesContainer.classList.add('hide');

        setTimeout(() => {
            fetch(`/get_articles?${params.toString()}`)
                .then(response => response.json())
                .then(data => {
                    renderArticles(data.articles);
                    updatePagination(data.current_page, data.total_pages);
                    window.scrollTo(0, 0);  // Scroll to top

                    // Fade in new articles
                    articlesContainer.classList.remove('hide');
                });
        }, 650); // Wait for the fade-out transition to finish (same as the 0.65s transition time)
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

    // Create an article element with image, date, title, and source image
    function createArticleElement(article) {
        const articleDiv = document.createElement('div');
        articleDiv.className = 'article';

        const sourceImage = sourceImageMapping[article.source];
        articleDiv.innerHTML = `
            <div class="article-content">
                <div class="article-image">
                    <img src="${article.image}" alt="${article.title}">
                </div>
                <p class="article-date">${formatDate(article.publish_date)}</p>
                <h2 class="article-title">${article.title}</h2>
                <img src="/static/images/${sourceImage}" alt="${article.source}" class="article-source-image">
            </div>
            <div class="article-summary">
                <button class="close-summary">&times;</button>
                <h3 class="summary-caption">Summary</h3>
                <div class="summary-text">${article.summary}</div>
                <div class="summary-buttons">
                    <button class="btn-read-whole" onclick="window.open('${article.link}', '_blank')">Read Whole Article</button>
                </div>
            </div>
        `;

        // Make the entire article clickable
        articleDiv.addEventListener('click', toggleSummary);

        // Add event listener to the close button
        const closeButton = articleDiv.querySelector('.close-summary');
        closeButton.addEventListener('click', toggleSummary);
        return articleDiv;
    }

    // Toggle summary visibility
    function toggleSummary(event) {
        const articleElement = event.target.closest('.article');
        if (articleElement.classList.contains('summary-active')) {
            articleElement.classList.remove('summary-active');
        } else {
            articleElement.classList.add('summary-active');
        }
        event.stopPropagation(); // Prevents the entire card from toggling when clicking on close
    }

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

        pageNumbersContainer.innerHTML = `${current} of ${total}`;
    }

    // Function to select the clicked topic and keep its style
    function selectTopic(item) {
        selectedTopic = item.getAttribute('data-topic');

        // Remove selected class from all topics
        topicItems.forEach(topic => topic.classList.remove('selected-topic'));

        // Add selected class to the clicked topic
        item.classList.add('selected-topic');

        // Store the selected topic in localStorage
        localStorage.setItem('selectedTopic', selectedTopic);
    }

    // Event listeners for sidebar topics
    topicItems.forEach(item => {
        item.addEventListener('click', function() {
            selectTopic(this);

            // Fetch articles for the selected topic
            fetchArticles(1);

            // Close the menu after selecting a topic
            sideMenu.classList.remove('open');
            contentWrapper.classList.remove('menu-open');
            isMenuOpen = false;

            // Reset hamburger menu bars color to black and reverse animation
            hamburgerMenu.classList.remove('active');
        });
    });

    // Function to apply the selected topic style
    function applySelectedTopicStyle() {
        const storedTopic = localStorage.getItem('selectedTopic');
        if (storedTopic) {
            selectedTopic = storedTopic;
            topicItems.forEach(item => {
                if (item.getAttribute('data-topic') === selectedTopic) {
                    item.classList.add('selected-topic');
                } else {
                    item.classList.remove('selected-topic');
                }
            });
        }
    }

    // Apply the selected topic style on page load
    applySelectedTopicStyle();

    // Event listeners for keyword search
    keywordInput.addEventListener('input', () => fetchArticles(1));

    // Initial fetch
    fetchArticles();

    // Hamburger menu and sidebar behavior
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sideMenu = document.getElementById('side-menu');
    const contentWrapper = document.getElementById('content-wrapper');
    let isMenuOpen = false;

    // Toggle side menu
    hamburgerMenu.addEventListener('click', function() {
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            sideMenu.classList.add('open');
            contentWrapper.classList.add('menu-open');
            hamburgerMenu.classList.add('active'); // Add active class to animate to X
        } else {
            sideMenu.classList.remove('open');
            contentWrapper.classList.remove('menu-open');
            hamburgerMenu.classList.remove('active'); // Remove active class to revert to bars
        }
        applySelectedTopicStyle(); // Ensure the selected topic stays highlighted when menu toggles
    });

    // Search bar slide down/up functionality
    const searchIcon = document.getElementById('search-icon');
    const searchBar = document.getElementById('search-bar');
    const searchForm = document.getElementById('search-form');
    let isSearchBarOpen = false;

    searchIcon.addEventListener('click', function() {
        isSearchBarOpen = !isSearchBarOpen;
        if (isSearchBarOpen) {
            searchBar.classList.add('open');  // Slide the search bar down
        } else {
            searchBar.classList.remove('open');  // Slide the search bar up
        }
    });

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        fetchArticles(1);  // Trigger article search
        searchBar.classList.remove('open');  // Slide the search bar up after search
        isSearchBarOpen = false;
    });
});