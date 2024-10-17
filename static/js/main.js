// static/js/main.js

// Define global variables
window.searchBarOpen = false;

document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const keywordInput = document.getElementById('keyword-input');
    const articlesContainer = document.getElementById('articles-container');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const dateRangeInput = document.getElementById('date-range');
    const clearDateFilterButton = document.getElementById('clear-date-filter');
    const loadingScreen = document.getElementById('loading-screen');
    const stickyTitle = document.querySelector('.sticky-title');
    const topicItems = document.querySelectorAll('.side-menu .topic-item');
    const sourceItems = document.querySelectorAll('.side-menu .source-item');
    const searchIcon = document.getElementById('search-icon');
    const clearIcon = document.getElementById('clear-icon');
    let isInitialLoad = true;
    let selectedTopic = localStorage.getItem('selectedTopic') || 'all';
    let selectedSource = localStorage.getItem('selectedSource') || 'all';

    // Define resetFilters as a global function
    window.resetFilters = function resetFilters() {
        selectedTopic = 'all';
        selectedSource = 'all';
        if (keywordInput) {
            keywordInput.value = '';
        }
        if (dateRangeInput) {
            dateRangeInput.value = '';
            dateRangeInput.removeAttribute('data-start-date');
            dateRangeInput.removeAttribute('data-end-date');
        }
        localStorage.removeItem('selectedTopic');
        localStorage.removeItem('selectedSource');
        applySelectedStyles();
        currentPage = 1;
        fetchArticles(currentPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Reset the keyword search input to its original state
        if (keywordInput) {
            keywordInput.classList.remove('visible');
        }
        if (searchIcon) searchIcon.style.display = 'block';
        if (clearIcon) clearIcon.classList.remove('visible');
        window.searchBarOpen = false;
    };

    // Ensure the date input is visible
    if (dateRangeInput) {
        dateRangeInput.style.display = 'block';
    }

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
    if (keywordParam && keywordInput) {
        keywordInput.value = keywordParam;
        window.searchBarOpen = true;  // Set searchBarOpen to true if keyword is present
        keywordInput.classList.add('visible');
        if (searchIcon) searchIcon.style.display = 'none';
        if (clearIcon) clearIcon.classList.add('visible');
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

    // Flatpickr initialization
    if (dateRangeInput) {
        flatpickr(dateRangeInput, {
            mode: "range",
            dateFormat: "Y-m-d", // Keep backend format as Y-m-d
            onClose: function(selectedDates) {
                const options = { month: 'short', day: 'numeric', year: 'numeric' };

                if (selectedDates.length === 2) {
                    // If a range is selected (two dates)
                    const formattedStartDate = selectedDates[0].toLocaleDateString(undefined, options);
                    const formattedEndDate = selectedDates[1].toLocaleDateString(undefined, options);
                    dateRangeInput.value = `${formattedStartDate} - ${formattedEndDate}`;

                    // Set the start-date attribute as is, and add one day to end-date for inclusive range
                    dateRangeInput.setAttribute('data-start-date', selectedDates[0].toISOString().split('T')[0]);

                    const inclusiveEndDate = new Date(selectedDates[1]);
                    inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1); // Add one day to include the end date
                    dateRangeInput.setAttribute('data-end-date', inclusiveEndDate.toISOString().split('T')[0]);

                    clearDateFilterButton.style.display = 'inline'; // Show "X" button

                } else if (selectedDates.length === 1) {
                    // If only one date is selected, set both start and end dates to that date
                    const formattedDate = selectedDates[0].toLocaleDateString(undefined, options);
                    dateRangeInput.value = formattedDate;
                    dateRangeInput.setAttribute('data-start-date', selectedDates[0].toISOString().split('T')[0]);
                    dateRangeInput.setAttribute('data-end-date', selectedDates[0].toISOString().split('T')[0]);

                    clearDateFilterButton.style.display = 'inline'; // Show "X" button
                } else {
                    // If no dates are selected, clear attributes and hide "X" button
                    clearDateFilter();
                }

                fetchArticles(1); // Refetch articles with the new date range

                // Close the menu after date selection
                if (typeof window.closeMenu === 'function') {
                    window.closeMenu();
                }
            }
        });
    }

    // Clear the date filter and hide the "X" button
    function clearDateFilter() {
        if (dateRangeInput) {
            dateRangeInput.value = '';
            dateRangeInput.removeAttribute('data-start-date');
            dateRangeInput.removeAttribute('data-end-date');
            clearDateFilterButton.style.display = 'none'; // Hide "X" button
            fetchArticles(1); // Fetch articles without date filter

            // Close the menu after clearing date filter
            if (typeof window.closeMenu === 'function') {
                window.closeMenu();
            }
        }
    }

    // Add event listener for the "X" button to clear the date filter
    if (clearDateFilterButton) {
        clearDateFilterButton.addEventListener('click', clearDateFilter);
    }

    // Loading Screen Functions
    function showLoadingScreen() {
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    function hideLoadingScreen() {
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                loadingScreen.classList.remove('fade-out');
            }, 900);
        }
    }

    // Fetch and display articles
    window.fetchArticles = function fetchArticles(page = 1) {
        const keyword = keywordInput ? keywordInput.value.trim() : '';
        const startDate = dateRangeInput ? dateRangeInput.getAttribute('data-start-date') || '' : '';
        const endDate = dateRangeInput ? dateRangeInput.getAttribute('data-end-date') || '' : '';
        const params = new URLSearchParams({
            topic: selectedTopic,
            source: selectedSource,
            keyword: keyword,
            start_date: startDate,
            end_date: endDate,
            page: page
        });

        if (isInitialLoad) {
            showLoadingScreen();
        } else {
            if (articlesContainer) {
                articlesContainer.classList.add('hide');
            }
            document.getElementById('pagination-wrapper').classList.add('pagination-hide');
        }

        fetch(`/get_articles?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                setTimeout(() => {
                    renderArticles(data.articles);
                    updatePagination(data.current_page, data.total_pages);
                    window.scrollTo(0, 0);

                    // Use global searchBarOpen
                    if (stickyTitle && !window.searchBarOpen) {
                        stickyTitle.classList.remove('hide');
                    }

                    if (isInitialLoad) {
                        hideLoadingScreen();
                        isInitialLoad = false;
                    } else {
                        if (articlesContainer) {
                            articlesContainer.classList.remove('hide');
                        }
                        document.getElementById('pagination-wrapper').classList.remove('pagination-hide');
                    }
                }, isInitialLoad ? 0 : 650);
            })
            .catch(error => {
                console.error("Error fetching articles:", error);
                if (isInitialLoad) {
                    hideLoadingScreen();
                    isInitialLoad = false;
                }
            });
    };

    // Render articles
    function renderArticles(articles) {
        if (!articlesContainer) return;

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
        if (window.innerWidth <= 768 && stickyTitle) {
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

            // Close the menu after selecting a topic
            if (typeof window.closeMenu === 'function') {
                window.closeMenu();
            }
        });
    });

    sourceItems.forEach(item => {
        item.addEventListener('click', function() {
            selectSource(this);
            fetchArticles(1);

            // Close the menu after selecting a source
            if (typeof window.closeMenu === 'function') {
                window.closeMenu();
            }
        });
    });

    // Keyword Search
    if (keywordInput) {
        keywordInput.addEventListener('input', () => fetchArticles(1));

        // Modify this event listener to blur the input when Enter is pressed
        keywordInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                keywordInput.blur(); // This will close the keyboard on mobile devices
            }
        });
    }

    // Initial Setup
    applySelectedStyles();
    fetchArticles();
});