document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const articlesPerPage = 21;
    let searchBarOpen = false; // Track the state of the search bar
    let isMenuOpen = false; // Track if side menu is open
    let isInitialLoad = true;
    let cachedArticles = null;

    // DOM elements
    const keywordInput = document.getElementById('keyword-input');
    const searchIcon = document.getElementById('search-icon');
    const clearIcon = document.getElementById('clear-icon');
    const searchBox = document.querySelector('.search-box');
    const articlesContainer = document.getElementById('articles-container');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sideMenu = document.getElementById('side-menu');
    const contentWrapper = document.getElementById('content-wrapper');
    const stickyBar = document.querySelector('.sticky-bar');
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;
    let selectedTopic = 'all'; // Initialize with default topic
    let selectedSource = 'all'; // Initialize with default source
    const topicItems = document.querySelectorAll('.side-menu .topic-item');
    const sourceItems = document.querySelectorAll('.side-menu .source-item');

    // Event listener for "Enter" key press on the keyword input
    keywordInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();  // Prevent any form submission behavior

            // Close the mobile keyboard by blurring the input
            keywordInput.blur();
        }
    });

    // Source image mapping with URLs
    const sourceImageMapping = {
        "BBC News": { image: "bbc.png", url: "https://www.bbc.com/news/science_and_environment" },
        "Columbia Climate School": { image: "columbia.png", url: "https://news.climate.columbia.edu/" },
        "Earth911": { image: "earth911.png", url: "https://earth911.com/" },
        "Greenpeace": { image: "greenpeace.png", url: "https://www.greenpeace.org/canada/en/" },
        "Grist": { image: "grist.png", url: "https://grist.org/" },
        "The Guardian": { image: "guardian.png", url: "https://www.theguardian.com/us/environment" },
        "The Independent": { image: "independent.png", url: "https://www.independent.co.uk/climate-change/news" },
        "Yale Environment 360": { image: "yale.png", url: "https://e360.yale.edu/" }
    };

    // Helper function to format dates
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // New function to show loading screen
    function showLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    // New function to hide loading screen
    function hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.remove('fade-out');
        }, 900); // Match the CSS transition time
    }

    // Fetch and display articles with smooth transition
    function fetchArticles(page = 1) {
        const keyword = keywordInput.value.trim();
        
        // Fetch params with selected filters and current page
        const params = new URLSearchParams({
            topic: selectedTopic,
            source: selectedSource,
            keyword: keyword,
            page: page
        });
    
        if (isInitialLoad) {
            showLoadingScreen();
        } else {
            articlesContainer.classList.add('hide');
            document.getElementById('pagination-wrapper').classList.add('pagination-hide');
        }
    
        // Fetch articles without relying on `cachedArticles` for filtered results
        fetch(`/get_articles?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                setTimeout(() => {
                    renderArticles(data.articles);
                    updatePagination(data.current_page, data.total_pages);
                    window.scrollTo(0, 0);
                    document.querySelector('.sticky-title').classList.remove('hide');
    
                    if (isInitialLoad) {
                        hideLoadingScreen();
                        isInitialLoad = false;
                    } else {
                        articlesContainer.classList.remove('hide');
                        document.getElementById('pagination-wrapper').classList.remove('pagination-hide');
                    }
                }, isInitialLoad ? 0 : 650); // Match the CSS transition time
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

    // Create an article element with image, date, title, and clickable source image
    function createArticleElement(article) {
        const articleDiv = document.createElement('div');
        articleDiv.className = 'article';

        const source = sourceImageMapping[article.source];
        articleDiv.innerHTML = `
            <div class="article-content">
                <div class="article-image">
                    <img src="${article.image}" alt="${article.title}">
                </div>
                <p class="article-date">${formatDate(article.publish_date)}</p>
                <h2 class="article-title">${article.title}</h2>
                <a href="${source.url}" target="_blank" class="source-link">
                    <img src="/static/images/${source.image}" alt="${article.source}" class="article-source-image">
                </a>
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

        // Make the entire article clickable except for the source image
        articleDiv.addEventListener('click', toggleSummary);

        // Prevent summary toggle when clicking the source image link
        const sourceLink = articleDiv.querySelector('.source-link');
        sourceLink.addEventListener('click', (event) => {
            event.stopPropagation();
        });

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
        const maxVisiblePages = 5;
        const halfVisible = Math.floor(maxVisiblePages / 2);
    
        let startPage = Math.max(1, current - halfVisible);
        let endPage = Math.min(total, current + halfVisible);
    
        if (current <= halfVisible) {
            endPage = Math.min(total, maxVisiblePages);
        } else if (current + halfVisible >= total) {
            startPage = Math.max(1, total - maxVisiblePages + 1);
        }
    
        let pageNumbersHtml = '';
        for (let i = startPage; i <= endPage; i++) {
            if (i === current) {
                pageNumbersHtml += `<span class="pagination-number active">${i}</span>`;
            } else {
                pageNumbersHtml += `<span class="pagination-number">${i}</span>`;
            }
        }
    
        document.getElementById('page-numbers').innerHTML = pageNumbersHtml;
    
        prevPageBtn.disabled = current <= 1;
        nextPageBtn.disabled = current >= total;
    
        document.querySelectorAll('.pagination-number').forEach(pageNumber => {
            pageNumber.addEventListener('click', (event) => {
                const selectedPage = parseInt(event.target.textContent);
                fetchArticles(selectedPage);
            });
        });
    
        prevPageBtn.onclick = () => {
            if (current > 1) fetchArticles(current - 1);
        };
        nextPageBtn.onclick = () => {
            if (current < total) fetchArticles(current + 1);
        };
    }

    function selectTopic(item) {
        selectedTopic = item.getAttribute('data-topic');
    
        // Remove selected class from all topics
        topicItems.forEach(topic => topic.classList.remove('selected-topic'));
    
        // Add selected class to the clicked topic
        item.classList.add('selected-topic');
    
        // Store the selected topic in localStorage
        localStorage.setItem('selectedTopic', selectedTopic);
    
        // Hide sticky title on screens smaller than or equal to 768px
        if (window.innerWidth <= 768) {
            document.querySelector('.sticky-title').classList.add('hide');
        }
    }

    // Event listeners for sidebar topics
    topicItems.forEach(item => {
        item.addEventListener('click', function() {
            selectTopic(this);
    
            // Fetch articles for the selected topic
            fetchArticles(1);
            stickyBar.classList.remove('menu-open'); // Add this line
            // Close the menu after selecting a topic
            sideMenu.classList.remove('open');
            contentWrapper.classList.remove('menu-open');
            isMenuOpen = false;
    
            // Reset hamburger menu bars color to black and reverse animation
            hamburgerMenu.classList.remove('active');
        });
    });

    // Function to select the clicked source and keep its style
    function selectSource(item) {
        selectedSource = item.getAttribute('data-source');

        // Remove selected class from all sources
        sourceItems.forEach(source => source.classList.remove('selected-source'));

        // Add selected class to the clicked source
        item.classList.add('selected-source');

        // Store the selected source in localStorage
        localStorage.setItem('selectedSource', selectedSource);
    }

    // Event listeners for sidebar sources
    sourceItems.forEach(item => {
        item.addEventListener('click', function() {
            selectSource(this);

            // Fetch articles for the selected source
            fetchArticles(1);

            // Close the menu after selecting a source
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

    // Function to apply the selected source style
    function applySelectedSourceStyle() {
        const storedSource = localStorage.getItem('selectedSource');
        if (storedSource) {
            selectedSource = storedSource;
            sourceItems.forEach(item => {
                if (item.getAttribute('data-source') === selectedSource) {
                    item.classList.add('selected-source');
                } else {
                    item.classList.remove('selected-source');
                }
            });
        }
    }

    // Apply the selected topic and source style on page load
    applySelectedTopicStyle();
    applySelectedSourceStyle();

    // Event listeners for keyword search
    keywordInput.addEventListener('input', () => fetchArticles(1));

    // Initial fetch
    fetchArticles();

    // Hamburger menu and sidebar behavior
    hamburgerMenu.addEventListener('click', function(event) {
        event.stopPropagation();
        isMenuOpen = !isMenuOpen;
    
        if (isMenuOpen) {
            sideMenu.classList.add('open');
            contentWrapper.classList.add('menu-open');
            hamburgerMenu.classList.add('active');
    
            // Add 'menu-open' to sticky bar if scrolled
            if (stickyBar.classList.contains('scrolled')) {
                stickyBar.classList.add('menu-open');
            }
        } else {
            // Remove 'menu-open' from sticky-bar immediately on close
            stickyBar.classList.remove('menu-open');
            sideMenu.classList.remove('open');
            contentWrapper.classList.remove('menu-open');
            hamburgerMenu.classList.remove('active');
        }
        applySelectedTopicStyle();
        applySelectedSourceStyle();
    });

    // Close menu when clicking outside the menu
    document.addEventListener('click', function(event) {
        if (isMenuOpen && !sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            isMenuOpen = false;
            sideMenu.classList.remove('open');
            contentWrapper.classList.remove('menu-open');
            hamburgerMenu.classList.remove('active');
        }
    });

    // Prevent closing the menu when clicking inside it
    sideMenu.addEventListener('click', function(event) {
        event.stopPropagation(); // Ensure that clicking inside the side menu doesn't close it
    });

    // Border toggle for sticky bar based on scroll position and display title
    function toggleStickyBarBorder() {
        const headerBottom = header.getBoundingClientRect().bottom;
        const stickyBarBottom = stickyBar.getBoundingClientRect().bottom;
        const currentScrollY = window.scrollY;
        const isScrollingDown = currentScrollY > lastScrollY;
        lastScrollY = currentScrollY;
    
        if (isScrollingDown && stickyBarBottom >= headerBottom) {
            stickyBar.classList.add('scrolled');
    
            // Ensure 'menu-open' stays applied if menu is open and scrolled
            if (isMenuOpen) {
                stickyBar.classList.add('menu-open');
            }
        } else if (!isScrollingDown && stickyBarBottom <= headerBottom) {
            stickyBar.classList.remove('scrolled');
            stickyBar.classList.remove('menu-open'); // Remove 'menu-open' when scrolling up past header
        }
    }
    
    toggleStickyBarBorder();
    window.addEventListener('scroll', toggleStickyBarBorder);

    searchIcon.addEventListener('click', function() {
        if (!searchBarOpen) {
            keywordInput.classList.add('visible');
            searchIcon.style.display = 'none';
            clearIcon.classList.add('visible');
            searchBarOpen = true;
            keywordInput.focus();
            
            // Hide the sticky title when the search bar is open
            document.querySelector('.sticky-title').classList.add('hide');
        }
    });
    
    clearIcon.addEventListener('click', function() {
        keywordInput.value = '';
        keywordInput.classList.remove('visible');
        searchIcon.style.display = 'block';
        clearIcon.classList.remove('visible');
        searchBarOpen = false;
        fetchArticles(1);
        
        // Show the sticky title when the search bar is closed
        document.querySelector('.sticky-title').classList.remove('hide');
    });

    // Add event listeners for both home button and sticky title
    document.getElementById('home-button').addEventListener('click', resetFilters);
    document.querySelector('.logo').addEventListener('click', resetFilters);

    // Function to reset filters and scroll to top
    function resetFilters() {
        // Reset selected topic and source to 'all'
        selectedTopic = 'all';
        selectedSource = 'all';
        keywordInput.value = '';  // Clear keyword search
    
        // Clear stored topic and source in localStorage
        localStorage.removeItem('selectedTopic');
        localStorage.removeItem('selectedSource');
    
        // Remove selected class from all topics and sources
        topicItems.forEach(topic => topic.classList.remove('selected-topic'));
        sourceItems.forEach(source => source.classList.remove('selected-source'));
    
        // Mark "All" for topics and sources
        document.querySelector('.topic-item[data-topic="all"]').classList.add('selected-topic');
        document.querySelector('.source-item[data-source="all"]').classList.add('selected-source');
    
        // Reset pagination and fetch articles
        currentPage = 1;
        fetchArticles(currentPage);
    
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});