document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const articlesPerPage = 21;
    let searchBarOpen = false; // Track the state of the search bar
    let isMenuOpen = false; // Track if side menu is open

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

    // Track if search bar is open and screen size is below 590px
    function toggleSoteVisibility() {
        const stickyTitle = document.querySelector('.sticky-title');
        if (window.innerWidth <= 590 && searchBarOpen) {
            stickyTitle.classList.add('hide');
        } else {
            stickyTitle.classList.remove('hide');
        }
    }

    // Toggle search bar visibility and handle sote visibility
    searchIcon.addEventListener('click', function() {
        if (!searchBarOpen) {
            keywordInput.classList.add('visible'); // Show the search box
            searchIcon.style.display = 'none';    // Hide the magnifying glass
            clearIcon.classList.add('visible');   // Show the clear (X) icon
            searchBarOpen = true;
            keywordInput.focus(); // Focus on input when opened
            toggleSoteVisibility(); // Hide sote if screen size is small
        }
    });

    // Clear search and reset visibility when 'X' is clicked
    clearIcon.addEventListener('click', function() {
        keywordInput.value = '';                 // Clear input
        keywordInput.classList.remove('visible'); // Hide the search box
        clearIcon.classList.remove('visible');   // Hide the clear (X) icon
        searchIcon.style.display = 'inline';     // Show the magnifying glass
        searchBarOpen = false;
        fetchArticles(); // Reset article list with no keyword
        toggleSoteVisibility(); // Show sote if appropriate
    });

    // Adjust sote visibility on window resize
    window.addEventListener('resize', toggleSoteVisibility);

    // Submit search on Enter keypress
    keywordInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            fetchArticles(); // Apply keyword search
        }
    });

    // Fetch and display articles with smooth transition
    function fetchArticles(page = 1) {
        const keyword = keywordInput.value.trim();

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
    hamburgerMenu.addEventListener('click', function(event) {
        event.stopPropagation();
        isMenuOpen = !isMenuOpen;
    
        if (isMenuOpen) {
            sideMenu.classList.add('open');
            contentWrapper.classList.add('menu-open');
            hamburgerMenu.classList.add('active');
            
            // Only add 'menu-open' to sticky bar if it's scrolled past the header
            if (stickyBar.classList.contains('scrolled')) {
                stickyBar.classList.add('menu-open');
            }
        } else {
            sideMenu.classList.remove('open');
            contentWrapper.classList.remove('menu-open');
            hamburgerMenu.classList.remove('active');
            stickyBar.classList.remove('menu-open');
        }
        applySelectedTopicStyle();
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


    // Toggle search bar visibility
    searchIcon.addEventListener('click', function() {
        if (!searchBarOpen) {
            keywordInput.classList.add('visible');
            searchIcon.style.display = 'none';    
            clearIcon.classList.add('visible');   
            searchBarOpen = true;
            keywordInput.focus(); 
        }
    });
});