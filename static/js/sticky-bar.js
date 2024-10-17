// static/js/sticky-bar.js

document.addEventListener('DOMContentLoaded', function() {
    // Sticky Bar Elements
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sideMenu = document.getElementById('side-menu');
    const contentWrapper = document.getElementById('content-wrapper');
    const stickyBar = document.querySelector('.sticky-bar');
    const searchIcon = document.getElementById('search-icon');
    const clearIcon = document.getElementById('clear-icon');
    const keywordInput = document.getElementById('keyword-input');
    const homeButtons = Array.from(document.querySelectorAll('#home-button, .logo'));
    const stickyTitle = document.querySelector('.sticky-title');
    const header = document.querySelector('header');
    let lastScrollY = window.scrollY;
    let isMenuOpen = false;

    // Hamburger Menu Functionality
    if (hamburgerMenu && sideMenu && contentWrapper && stickyBar) {
        hamburgerMenu.addEventListener('click', toggleMenu);
        document.addEventListener('click', function(event) {
            if (isMenuOpen && !sideMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                closeMenu();
            }
        });
        sideMenu.addEventListener('click', event => event.stopPropagation());
    }

    // Define closeMenu as a global function
    window.closeMenu = function closeMenu() {
        isMenuOpen = false;
        hamburgerMenu.classList.remove('active');
        sideMenu.classList.remove('open');
        contentWrapper.classList.remove('menu-open');
        stickyBar.classList.remove('menu-open');
    };

    function toggleMenu(event) {
        event.stopPropagation();
        isMenuOpen = !isMenuOpen;
        hamburgerMenu.classList.toggle('active', isMenuOpen);
        sideMenu.classList.toggle('open', isMenuOpen);
        contentWrapper.classList.toggle('menu-open', isMenuOpen);
        stickyBar.classList.toggle('menu-open', isMenuOpen && stickyBar.classList.contains('scrolled'));
    }

    // Search Icon Functionality
    if (searchIcon && clearIcon && keywordInput && stickyTitle) {
        searchIcon.addEventListener('click', function() {
            if (!window.searchBarOpen) {
                keywordInput.classList.add('visible');
                searchIcon.style.display = 'none';
                clearIcon.classList.add('visible');
                window.searchBarOpen = true; // Update global variable
                keywordInput.focus();
                stickyTitle.classList.add('hide');
            }
        });

        clearIcon.addEventListener('click', function() {
            keywordInput.value = '';
            keywordInput.classList.remove('visible');
            searchIcon.style.display = 'block';
            clearIcon.classList.remove('visible');
            window.searchBarOpen = false; // Update global variable

            // Show sticky title if conditions are met
            if (window.innerWidth > 590 || stickyBar.classList.contains('scrolled')) {
                stickyTitle.classList.remove('hide');
            }

            // Call fetchArticles(1) to reset keyword filter
            if (typeof window.fetchArticles === 'function') {
                window.fetchArticles(1);
            }
        });
    }

    // Home Button Functionality
    if (homeButtons.length > 0) {
        homeButtons.forEach(button => button.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior if any

            if (typeof resetFilters === 'function') {
                resetFilters();
            } else {
                // If resetFilters is not defined (e.g., on wordcloud.html), then redirect
                window.location.href = '/';
            }
        }));
    }

    // Sticky Bar Scroll Behavior
    if (stickyBar && header) {
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
                if (window.searchBarOpen && stickyTitle) {
                    stickyTitle.classList.add('hide');
                }
            } else if (!isScrollingDown && stickyBarBottom <= headerBottom) {
                stickyBar.classList.remove('scrolled', 'menu-open');

                // Hide sticky title if search bar is open
                if (window.searchBarOpen && stickyTitle) {
                    stickyTitle.classList.add('hide');
                }
            }
        }

        window.addEventListener('scroll', toggleStickyBarBorder);
        toggleStickyBarBorder();
    }
});