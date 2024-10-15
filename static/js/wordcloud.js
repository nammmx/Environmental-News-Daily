document.addEventListener("DOMContentLoaded", function () {
    const sourceDropdown = document.getElementById("source");
    const topicDropdown = document.getElementById("topic");
    const applyFiltersButton = document.getElementById("apply-filters");

    let selectedWord = ""; // To store the clicked word

    // Retrieve saved filters from localStorage (if they exist)
    const savedSource = localStorage.getItem('selectedSource') || "";
    const savedTopic = localStorage.getItem('selectedTopic') || "";
    const savedKeyword = localStorage.getItem('selectedKeyword') || "";

    // Set the dropdowns and selected word to the saved values
    sourceDropdown.value = savedSource;
    topicDropdown.value = savedTopic;
    selectedWord = savedKeyword; // Set initial selected word, if needed

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

            // Apply saved values to dropdowns after they've been populated
            sourceDropdown.value = savedSource;
            topicDropdown.value = savedTopic;
        })
        .catch(error => console.error("Error loading filter options:", error));

    // Create a container to display the selected word and arrow
    const selectedWordDisplay = document.createElement("div");
    selectedWordDisplay.id = "selected-word";
    selectedWordDisplay.style.opacity = "0"; // Initially hidden
    selectedWordDisplay.innerHTML = `<span id="arrow" style="cursor: pointer; opacity: 0;">&larr;</span> <span id="word-text"></span>`;
    document.body.appendChild(selectedWordDisplay); // Append to body to avoid layout shifts

    const arrow = selectedWordDisplay.querySelector("#arrow");
    const wordText = selectedWordDisplay.querySelector("#word-text");

    function drawWordCloud() {
        const source = sourceDropdown.value;
        const topic = topicDropdown.value;

        const url = new URL(window.location.origin + "/data");
        if (source) url.searchParams.append("source", source);
        if (topic) url.searchParams.append("topic", topic);

        fetch(url)
            .then(response => response.json())
            .then(wordData => {
                // Ensure exactly 250 words, padding with placeholders if needed
                while (wordData.length < 250) {
                    wordData.push({ text: `placeholder${wordData.length}`, size: 1 });
                }
                const displayedWords = wordData.slice(0, 250);

                const wordCloudContainer = document.getElementById("wordcloud");
                const width = wordCloudContainer.offsetWidth;
                const height = Math.min(wordCloudContainer.offsetHeight, window.innerHeight * 0.8);

                // Apply fade-out effect to the container
                d3.select(wordCloudContainer)
                    .transition()
                    .duration(500) // Duration of the fade-out
                    .style("opacity", 0)
                    .on("end", () => {
                        // Clear any existing SVG to fully restart the layout
                        wordCloudContainer.innerHTML = "";
                        d3.select(wordCloudContainer).style("opacity", 1); // Reset opacity after clearing

                        // Set up scales for font size and color based on word frequency
                        const maxFrequency = d3.max(displayedWords, d => d.size);
                        const fontSizeScale = d3.scaleSqrt()
                            .domain([1, maxFrequency])
                            .range([Math.max(2, width / 120), Math.min(height / 8, width / 15)]);

                        const colorScale = d3.scaleLinear()
                            .domain([1, maxFrequency])
                            .range(["#A9D8B8", "#005F00"]); // Light green to dark green

                        const layout = d3.layout.cloud()
                            .size([width, height])
                            .words(displayedWords.map(d => ({
                                text: d.text,
                                size: fontSizeScale(d.size),
                                frequency: d.size
                            })))
                            .padding(2) // Keep padding as is
                            .rotate(0) // Keep words horizontal
                            .font("Impact") // Set font to Impact
                            .fontSize(d => d.size)
                            .spiral("archimedean") // Keep spiral setting as is
                            .on("end", draw);

                        layout.start();

                        function draw(words) {
                            const svg = d3.select("#wordcloud")
                                .append("svg")
                                .attr("width", width)
                                .attr("height", height)
                                .append("g")
                                .attr("transform", `translate(${width / 2}, ${height / 2})`);
                        
                            const text = svg.selectAll("text")
                                .data(words, d => d.text);
                        
                            text.enter().append("text")
                                .style("font-size", d => `${d.size}px`)
                                .style("fill", d => colorScale(d.frequency))
                                .style("font-family", "Impact")
                                .attr("text-anchor", "middle")
                                .style("opacity", 0)
                                .style("cursor", "pointer")
                                .text(d => d.text)
                                .on("click", function(event, d) {
                                    selectedWord = d.text; // Save the clicked word

                                    // Calculate the position of the clicked word
                                    const rect = this.getBoundingClientRect();

                                    // Set initial position of `selectedWordDisplay` to the clicked word's position
                                    selectedWordDisplay.style.transition = "none"; // Disable transition for initial positioning
                                    selectedWordDisplay.style.left = `${rect.left + window.scrollX}px`;
                                    selectedWordDisplay.style.top = `${rect.top + window.scrollY}px`;

                                    // Set the word content and make the display visible immediately
                                    wordText.textContent = selectedWord;
                                    selectedWordDisplay.style.opacity = "1";

                                    // Transition the display to the final destination
                                    setTimeout(() => {
                                        selectedWordDisplay.style.transition = "left 1s, top 1s";
                                        selectedWordDisplay.style.left = "100px";
                                        selectedWordDisplay.style.top = "150px";

                                        setTimeout(() => {
                                            arrow.style.opacity = "1"; // Show arrow after reaching the final position
                                        }, 1000);
                                    }, 50); // Short delay to ensure the initial position is rendered

                                    // Hide the word cloud
                                    d3.select("#wordcloud")
                                        .transition()
                                        .duration(500)
                                        .style("opacity", 0)
                                        .style("pointer-events", "none");
                                })
                                .on("mouseover", function(event, d) {
                                    d3.select(this)
                                        .transition()
                                        .duration(150)
                                        .attr("transform", `translate(${d.x}, ${d.y}) scale(1.1)`);
                                })
                                .on("mouseout", function(event, d) {
                                    d3.select(this)
                                        .transition()
                                        .duration(150)
                                        .attr("transform", `translate(${d.x}, ${d.y}) scale(1)`);
                                })
                                .transition()
                                .duration(750)
                                .attr("transform", d => `translate(${d.x}, ${d.y})`)
                                .style("opacity", 1);
                        }
                    });
            })
            .catch(error => console.error("Error loading word data:", error));
    }

    drawWordCloud();
    sourceDropdown.addEventListener("change", () => {
        fadeOutSelectedWordAndShowWordCloud();
        drawWordCloud();
    });
    topicDropdown.addEventListener("change", () => {
        fadeOutSelectedWordAndShowWordCloud();
        drawWordCloud();
    });

    applyFiltersButton.addEventListener("click", () => {
        const selectedSource = sourceDropdown.value;
        const selectedTopic = topicDropdown.value;
        
        // Save the selected filters to localStorage
        localStorage.setItem('selectedSource', selectedSource);
        localStorage.setItem('selectedTopic', selectedTopic);
        localStorage.setItem('selectedKeyword', selectedWord); // Store the selected word as a keyword, if needed

        // Build the URL with query parameters
        const url = new URL(window.location.origin + "/");
        if (selectedSource) url.searchParams.append("source", selectedSource);
        if (selectedTopic) url.searchParams.append("topic", selectedTopic);
        if (selectedWord) url.searchParams.append("keyword", selectedWord);

        // Redirect to index.html with the selected filters
        window.location.href = url;
    });

    // Click event for arrow to hide selected word and show the word cloud
    arrow.addEventListener("click", fadeOutSelectedWordAndShowWordCloud);

    function fadeOutSelectedWordAndShowWordCloud() {
        arrow.style.opacity = "0"; // Hide the arrow
        selectedWordDisplay.style.opacity = "0"; // Hide the selected word
        d3.select("#wordcloud")
            .transition()
            .duration(500)
            .style("opacity", 1) // Bring back the word cloud
            .style("pointer-events", "auto");
    }
});