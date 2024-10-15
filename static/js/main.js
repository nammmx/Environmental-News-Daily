document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const searchIcon = document.getElementById('search-icon');
    const clearIcon = document.getElementById('clear-icon');
    const keywordInput = document.getElementById('keyword-input');
    const articlesContainer = document.getElementById('articles-container');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sideMenu = document.getElementById('side-menu');
    const contentWrapper = document.getElementById('content-wrapper');
    const stickyBar = document.querySelector('.sticky-bar');
    const header = document.querySelector('header');
    const topicItems = document.querySelectorAll('.side-menu .topic-item');
    const sourceItems = document.querySelectorAll('.side-menu .source-item');
    const loadingScreen = document.getElementById('loading-screen');
    const stickyTitle = document.querySelector('.sticky-title');
    const homeButtons = [document.getElementById('home-button'), document.querySelector('.logo')];
    let lastScrollY = window.scrollY;
    let isMenuOpen = false;
    let isInitialLoad = true;
    let searchBarOpen = false;
    let selectedTopic = localStorage.getItem('selectedTopic') || 'all';
    let selectedSource = localStorage.getItem('selectedSource') || 'all';

    const params = new URLSearchParams(window.location.search);
    const topicParam = params.get('topic');
    const sourceParam = params.get('source');
    const keywordParam = params.get('keyword');

    if (topicParam) {
        selectedTopic = topicParam;
    }
    if (sourceParam) {
        selectedSource = sourceParam;
    }
    if (keywordParam) {
        keywordInput.value = keywordParam;
        searchBarOpen = true;
        keywordInput.classList.add('visible');
        searchIcon.style.display = 'none';
        clearIcon.classList.add('visible');
    }
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

    // Add this function at the beginning of main.js to retrieve query parameters
    function getQueryParameter(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Check for 'keyword' query parameter on load
    const keywordFromUrl = getQueryParameter('keyword');
    if (keywordFromUrl) {
        keywordInput.value = keywordFromUrl;  // Set the search input with the keyword from URL
        searchBarOpen = true;  // Open the search bar
        keywordInput.classList.add('visible'); // Show the search bar
        searchIcon.style.display = 'none';     // Hide the search icon
        clearIcon.classList.add('visible');    // Show the clear icon
        fetchArticles(1); // Trigger search with the keyword
    }

    // Loading Screen Functions
    function showLoadingScreen() {
        loadingScreen.style.display = 'flex';
    }

    function hideLoadingScreen() {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            loadingScreen.classList.remove('fade-out');
        }, 900);
    }

    // Fetch and display articles
    function fetchArticles(page = 1) {
        const keyword = keywordInput.value.trim();
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

        fetch(`/get_articles?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                setTimeout(() => {
                    renderArticles(data.articles);
                    updatePagination(data.current_page, data.total_pages);
                    window.scrollTo(0, 0);

                    // Only remove 'hide' class if searchBarOpen is false
                    if (!searchBarOpen) {
                        stickyTitle.classList.remove('hide');
                    }

                    if (isInitialLoad) {
                        hideLoadingScreen();
                        isInitialLoad = false;
                    } else {
                        articlesContainer.classList.remove('hide');
                        document.getElementById('pagination-wrapper').classList.remove('pagination-hide');
                    }
                }, isInitialLoad ? 0 : 650);
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

    // Create article element
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
        articleDiv.addEventListener('click', toggleSummary);
        const sourceLink = articleDiv.querySelector('.source-link');
        sourceLink.addEventListener('click', (event) => event.stopPropagation());
        const closeButton = articleDiv.querySelector('.close-summary');
        closeButton.addEventListener('click', toggleSummary);
        return articleDiv;
    }

    // Toggle summary visibility
    function toggleSummary(event) {
        const articleElement = event.target.closest('.article');
        articleElement.classList.toggle('summary-active');
        event.stopPropagation();
    }

    // Update Pagination
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

        pageNumbersContainer.innerHTML = '';
        for (let i = startPage; i <= endPage; i++) {
            const pageSpan = document.createElement('span');
            pageSpan.className = 'pagination-number' + (i === current ? ' active' : '');
            pageSpan.textContent = i;
            pageSpan.addEventListener('click', () => fetchArticles(i));
            pageNumbersContainer.appendChild(pageSpan);
        }

        prevPageBtn.disabled = current <= 1;
        nextPageBtn.disabled = current >= total;

        prevPageBtn.onclick = () => current > 1 && fetchArticles(current - 1);
        nextPageBtn.onclick = () => current < total && fetchArticles(current + 1);
    }

    // Select Topic
    function selectTopic(item) {
        selectedTopic = item.getAttribute('data-topic');
        topicItems.forEach(topic => topic.classList.remove('selected-topic'));
        item.classList.add('selected-topic');
        localStorage.setItem('selectedTopic', selectedTopic);
        if (window.innerWidth <= 768) {
            stickyTitle.classList.add('hide');
        }
    }

    // Select Source
    function selectSource(item) {
        selectedSource = item.getAttribute('data-source');
        sourceItems.forEach(source => source.classList.remove('selected-source'));
        item.classList.add('selected-source');
        localStorage.setItem('selectedSource', selectedSource);
    }

    // Apply Selected Topic and Source Styles
    function applySelectedStyles() {
        topicItems.forEach(item => {
            item.getAttribute('data-topic') === selectedTopic ?
                item.classList.add('selected-topic') :
                item.classList.remove('selected-topic');
        });
        sourceItems.forEach(item => {
            item.getAttribute('data-source') === selectedSource ?
                item.classList.add('selected-source') :
                item.classList.remove('selected-source');
        });
    }

    // Event Listeners for Topics and Sources
    topicItems.forEach(item => {
        item.addEventListener('click', function() {
            selectTopic(this);
            fetchArticles(1);
            closeMenu();
        });
    });

    sourceItems.forEach(item => {
        item.addEventListener('click', function() {
            selectSource(this);
            fetchArticles(1);
            closeMenu();
        });
    });

    // Keyword Search
    keywordInput.addEventListener('input', () => fetchArticles(1));

    // Modify this event listener to blur the input when Enter is pressed
    keywordInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            keywordInput.blur(); // This will close the keyboard on mobile devices
        }
    });

    // Hamburger Menu
    function toggleMenu(event) {
        event.stopPropagation();
        isMenuOpen = !isMenuOpen;
        hamburgerMenu.classList.toggle('active', isMenuOpen);
        sideMenu.classList.toggle('open', isMenuOpen);
        contentWrapper.classList.toggle('menu-open', isMenuOpen);
        stickyBar.classList.toggle('menu-open', isMenuOpen && stickyBar.classList.contains('scrolled'));
        applySelectedStyles();
    }

    function closeMenu() {
        isMenuOpen = false;
        hamburgerMenu.classList.remove('active');
        sideMenu.classList.remove('open');
        contentWrapper.classList.remove('menu-open');
        stickyBar.classList.remove('menu-open');
    }

    hamburgerMenu.addEventListener('click', toggleMenu);
    document.addEventListener('click', function(event) {
        if (isMenuOpen && !sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            closeMenu();
        }
    });
    sideMenu.addEventListener('click', event => event.stopPropagation());

    // Sticky Bar Scroll Behavior
    function toggleStickyBarBorder() {
        const headerBottom = header.getBoundingClientRect().bottom;
        const stickyBarBottom = stickyBar.getBoundingClientRect().bottom;
        const currentScrollY = window.scrollY;
        const isScrollingDown = currentScrollY > lastScrollY;
        lastScrollY = currentScrollY;

        if (isScrollingDown && stickyBarBottom >= headerBottom) {
            stickyBar.classList.add('scrolled');
            if (isMenuOpen) stickyBar.classList.add('menu-open');

            // Hide sticky title if search bar is open
            if (searchBarOpen) {
                stickyTitle.classList.add('hide');
            }
        } else if (!isScrollingDown && stickyBarBottom <= headerBottom) {
            stickyBar.classList.remove('scrolled', 'menu-open');

            // Hide sticky title if search bar is open
            if (searchBarOpen) {
                stickyTitle.classList.add('hide');
            }
        }
    }

    window.addEventListener('scroll', toggleStickyBarBorder);
    toggleStickyBarBorder();

    // Search Icon Behavior
    searchIcon.addEventListener('click', function() {
        if (!searchBarOpen) {
            keywordInput.classList.add('visible');
            searchIcon.style.display = 'none';
            clearIcon.classList.add('visible');
            searchBarOpen = true;
            keywordInput.focus();
            stickyTitle.classList.add('hide');
        }
    });

    clearIcon.addEventListener('click', function() {
        keywordInput.value = '';
        keywordInput.classList.remove('visible');
        searchIcon.style.display = 'block';
        clearIcon.classList.remove('visible');
        searchBarOpen = false;
        fetchArticles(1);

        // Show sticky title if conditions are met
        if (window.innerWidth > 590 || stickyBar.classList.contains('scrolled')) {
            stickyTitle.classList.remove('hide');
        }
    });

    // Home Buttons Reset Filters
    homeButtons.forEach(button => button.addEventListener('click', resetFilters));

    function resetFilters() {
        selectedTopic = 'all';
        selectedSource = 'all';
        keywordInput.value = '';
        localStorage.removeItem('selectedTopic');
        localStorage.removeItem('selectedSource');
        applySelectedStyles();
        currentPage = 1;
        fetchArticles(currentPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    
        // Reset the keyword search input to its original state
        keywordInput.classList.remove('visible');
        searchIcon.style.display = 'block';
        clearIcon.classList.remove('visible');
        searchBarOpen = false;
    }

    // Initial Setup
    applySelectedStyles();
    fetchArticles();
});