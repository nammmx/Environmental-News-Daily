document.addEventListener("DOMContentLoaded", function () {
    const sourceDropdown = document.getElementById("source");
    const topicDropdown = document.getElementById("topic");
    const dateRangeInput = document.getElementById("date-range");
    const clearDateFilterButton = document.getElementById("clear-date-filter");

    let selectedWord = ""; // To store the clicked word

    // Function to get today's date in the format 'YYYY-MM-DD'
    function getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // Get date part only
    }

    // Check localStorage for dates or set to today if none are stored
    let startDate = localStorage.getItem('startDate') || getTodayDate();
    let endDate = localStorage.getItem('endDate') || getTodayDate();

    // Initialize flatpickr for date range input
    flatpickr(dateRangeInput, {
        mode: "range",
        dateFormat: "Y-m-d",
        defaultDate: [startDate, endDate], // Set default to today or stored dates
        onChange: function (selectedDates) {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };

            if (selectedDates.length === 2) {
                const formattedStartDate = selectedDates[0].toLocaleDateString(undefined, options);
                const formattedEndDate = selectedDates[1].toLocaleDateString(undefined, options);
                dateRangeInput.value = `${formattedStartDate} - ${formattedEndDate}`;
                clearDateFilterButton.style.display = "inline"; // Show the "X" button

                const endDate = new Date(selectedDates[1]);
                if (selectedDates[0].getTime() !== selectedDates[1].getTime()) {
                    endDate.setDate(endDate.getDate() + 1); // Add one day for inclusive range if range > 1 day
                }

                localStorage.setItem('startDate', selectedDates[0].toISOString().split('T')[0]);
                localStorage.setItem('endDate', endDate.toISOString().split('T')[0]);

                updateWordCloud();
            } else {
                dateRangeInput.value = "";
                clearDateFilterButton.style.display = "none";
                localStorage.removeItem('startDate');
                localStorage.removeItem('endDate');
                updateWordCloud();
            }
        }
    });

    // Retrieve saved filters from localStorage (if they exist)
    const savedSource = localStorage.getItem('selectedSource') || "";
    const savedTopic = localStorage.getItem('selectedTopic') || "";
    const savedKeyword = localStorage.getItem('selectedKeyword') || "";
    const savedStartDate = localStorage.getItem('startDate') || "";
    const savedEndDate = localStorage.getItem('endDate') || "";

    // Set the dropdowns and selected word to the saved values
    sourceDropdown.value = savedSource;
    topicDropdown.value = savedTopic;
    selectedWord = savedKeyword;

    // Apply initial date range on load
    function applyInitialDateRange() {
        if (!localStorage.getItem('startDate') || !localStorage.getItem('endDate')) {
            startDate = getTodayDate();
            endDate = getTodayDate();
            localStorage.setItem('startDate', startDate);
            localStorage.setItem('endDate', endDate);
        }

        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        const formattedStartDate = new Date(startDate).toLocaleDateString(undefined, options);
        const formattedEndDate = new Date(endDate).toLocaleDateString(undefined, options);
        dateRangeInput.value = `${formattedStartDate} - ${formattedEndDate}`;
        clearDateFilterButton.style.display = "inline";
    }

    applyInitialDateRange();

    clearDateFilterButton.addEventListener("click", () => {
        dateRangeInput.value = "";
        localStorage.removeItem('startDate');
        localStorage.removeItem('endDate');
        clearDateFilterButton.style.display = "none";
        updateWordCloud();
    });

    // Fetch filter options and populate dropdowns
    fetch("/filter-options")
        .then(response => response.json())
        .then(data => {
            data.sources.forEach(source => {
                const option = document.createElement("option");
                option.value = source;
                option.text = source;
                sourceDropdown.add(option);
            });
            data.topics.forEach(topic => {
                const option = document.createElement("option");
                option.value = topic;
                option.text = topic;
                topicDropdown.add(option);
            });

            sourceDropdown.value = savedSource;
            topicDropdown.value = savedTopic;
        })
        .catch(error => console.error("Error loading filter options:", error));

    function updateWordCloud() {
        const source = sourceDropdown.value;
        const topic = topicDropdown.value;
        const startDate = localStorage.getItem('startDate');
        const endDate = localStorage.getItem('endDate');

        const url = new URL(window.location.origin + "/data");
        if (source) url.searchParams.append("source", source);
        if (topic) url.searchParams.append("topic", topic);
        if (startDate) url.searchParams.append("start_date", startDate);
        if (endDate) url.searchParams.append("end_date", endDate);

        fetch(url)
            .then(response => response.json())
            .then(wordData => {
                const maxWords = window.innerWidth <= 768 ? 150 : 250;

                while (wordData.length < maxWords) {
                    wordData.push({ text: `placeholder${wordData.length}`, size: 1 });
                }
                const displayedWords = wordData.slice(0, maxWords);

                const wordCloudContainer = document.getElementById("wordcloud");

                wordCloudContainer.style.display = "none"; // Hide to force reflow
                void wordCloudContainer.offsetHeight; // Force reflow
                wordCloudContainer.style.display = "block";

                const width = wordCloudContainer.offsetWidth;
                const height = Math.min(wordCloudContainer.offsetHeight, window.innerHeight * 0.8);

                const maxFrequency = d3.max(displayedWords, d => d.size);

                const fontSizeScale = d3.scaleSqrt()
                    .domain([1, maxFrequency])
                    .range(window.innerWidth <= 768
                        ? [Math.max(4, width / 100), Math.min(height / 5, width / 8)]
                        : [Math.max(2, width / 120), Math.min(height / 8, width / 15)]);

                const colorScale = d3.scaleLinear()
                    .domain([1, maxFrequency])
                    .range(["#A9D8B8", "#005F00"]);

                wordCloudContainer.innerHTML = ""; // Clear previous content

                const layout = d3.layout.cloud()
                    .size([width, height])
                    .words(displayedWords.map(d => ({
                        text: d.text,
                        size: fontSizeScale(d.size),
                        frequency: d.size
                    })))
                    .padding(2)
                    .rotate(0)
                    .font("Impact")
                    .fontSize(d => d.size)
                    .spiral("archimedean")
                    .on("end", draw);

                // Add a longer delay for Chrome to handle layout reflow properly
                setTimeout(() => requestAnimationFrame(() => layout.start()), 300);

                function draw(words) {
                    const svg = d3.select("#wordcloud")
                        .append("svg")
                        .attr("width", width)
                        .attr("height", height)
                        .style("margin", "0 auto")
                        .attr("viewBox", `0 0 ${width} ${height}`)
                        .attr("preserveAspectRatio", "xMidYMid meet");

                    const g = svg.append("g")
                        .attr("transform", `translate(${width / 2}, ${height / 2})`);

                    g.selectAll("text")
                        .data(words, d => d.text)
                        .enter().append("text")
                        .style("font-size", d => `${d.size}px`)
                        .style("fill", d => colorScale(d.frequency))
                        .style("font-family", "Impact")
                        .attr("text-anchor", "middle")
                        .style("opacity", 0)
                        .style("cursor", "pointer")
                        .text(d => d.text)
                        .attr("transform", d => `translate(${d.x}, ${d.y})`)
                        .on("click", function (event, d) {
                            const selectedWord = d.text;
                            const url = new URL(window.location.origin + "/");
                            if (selectedWord) url.searchParams.append("keyword", selectedWord);
                            window.location.href = url;
                        })
                        .on("mouseover", function (event, d) {
                            d3.select(this)
                                .transition()
                                .duration(150)
                                .attr("transform", `translate(${d.x}, ${d.y}) scale(1.1)`);
                        })
                        .on("mouseout", function (event, d) {
                            d3.select(this)
                                .transition()
                                .duration(150)
                                .attr("transform", `translate(${d.x}, ${d.y}) scale(1)`);
                        })
                        .transition()
                        .duration(750)
                        .style("opacity", 1);
                }
            })
            .catch(error => console.error("Error loading word data:", error));
    }

    // Ensure updateWordCloud runs after everything is loaded
    window.addEventListener('load', () => {
        setTimeout(() => {
            const wordCloudContainer = document.getElementById("wordcloud");
            wordCloudContainer.style.display = "none";
            void wordCloudContainer.offsetHeight; // Force reflow
            wordCloudContainer.style.display = "block";
            updateWordCloud();
        }, 500);
    });

    // Event listeners for dropdowns and date range input
    sourceDropdown.addEventListener("change", () => {
        localStorage.setItem('selectedSource', sourceDropdown.value);
        updateWordCloud();
    });

    topicDropdown.addEventListener("change", () => {
        localStorage.setItem('selectedTopic', topicDropdown.value);
        updateWordCloud();
    });

    dateRangeInput.addEventListener("change", () => {
        updateWordCloud();
    });
});