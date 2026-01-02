(function () {
    // Configuration
    const SCROLL_IDLE_TIME = 1200; // 1.2 seconds before generating
    const MIN_TEXT_LENGTH = 200; // Minimum visible text to trigger generation
    const GUTENDEX_API = "https://gutendex.com/books";
    const LOCAL_PROXY_URL = "http://localhost:8080/proxy.php";

    // State
    let scrollTimeout = null;
    let isGenerating = false;
    let currentImageHash = null;
    let apiKey = localStorage.getItem("openrouter_api_key") || "";
    let currentPage = 1;
    let currentSearch = "";
    let totalBooks = 0;
    let pendingBook = null;
    let pendingTextUrl = null;

    // Elements
    const generatedImage = document.getElementById("generated-image");
    const loadingIndicator = document.getElementById("loading-indicator");
    const apiKeyPrompt = document.getElementById("api-key-prompt");
    const apiKeyInput = document.getElementById("api-key-input");
    const saveApiKeyBtn = document.getElementById("save-api-key");
    const apiKeyToggle = document.getElementById("api-key-toggle");

    // Book selection elements
    const bookSelectOverlay = document.getElementById("book-select-overlay");
    const bookSearchInput = document.getElementById("book-search");
    const searchBtn = document.getElementById("search-btn");
    const bookList = document.getElementById("book-list");
    const bookLoading = document.getElementById("book-loading");
    const prevPageBtn = document.getElementById("prev-page");
    const nextPageBtn = document.getElementById("next-page");
    const pageInfo = document.getElementById("page-info");

    // Dark mode toggle
    const darkModeToggle = document.getElementById("dark-mode-toggle");
    let darkMode = localStorage.getItem("dark_mode") === "true";

    // Manual text input elements
    const textInputOverlay = document.getElementById("text-input-overlay");
    const openBookTabBtn = document.getElementById("open-book-tab");
    const manualTextInput = document.getElementById("manual-text-input");
    const cancelTextInputBtn = document.getElementById("cancel-text-input");
    const submitTextInputBtn = document.getElementById("submit-text-input");

    function applyDarkMode() {
        if (darkMode) {
            document.body.classList.add("dark-mode");
            darkModeToggle.textContent = "🌙";
        } else {
            document.body.classList.remove("dark-mode");
            darkModeToggle.textContent = "☀️";
        }
    }

    applyDarkMode();

    darkModeToggle.addEventListener("click", () => {
        darkMode = !darkMode;
        localStorage.setItem("dark_mode", darkMode);
        applyDarkMode();
    });

    // Initialize
    if (apiKey) {
        apiKeyPrompt.classList.add("hidden");
        apiKeyToggle.classList.remove("hidden");
    }

    // Show book selection popup on load
    fetchBooks();

    // Book search and pagination
    searchBtn.addEventListener("click", () => {
        currentSearch = bookSearchInput.value.trim();
        currentPage = 1;
        fetchBooks();
    });

    bookSearchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            currentSearch = bookSearchInput.value.trim();
            currentPage = 1;
            fetchBooks();
        }
    });

    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            fetchBooks();
        }
    });

    nextPageBtn.addEventListener("click", () => {
        currentPage++;
        fetchBooks();
    });

    async function fetchBooks() {
        bookLoading.classList.remove("hidden");
        bookList.innerHTML = "";

        let url = `${GUTENDEX_API}?page=${currentPage}&languages=en`;

        if (currentSearch) {
            url += `&search=${encodeURIComponent(currentSearch)}`;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            totalBooks = data.count;
            const totalPages = Math.ceil(totalBooks / 32);

            renderBooks(data.results);
            updatePagination(totalPages);
        } catch (error) {
            console.error("Failed to fetch books:", error);
            bookList.innerHTML = '<p style="text-align:center;color:#666;">Failed to load books. Please try again.</p>';
        } finally {
            bookLoading.classList.add("hidden");
        }
    }

    function renderBooks(books) {
        bookList.innerHTML = "";

        books.forEach((book) => {
            const authors = book.authors.map((a) => a.name).join(", ") || "Unknown Author";
            const item = document.createElement("div");
            item.className = "book-item";
            item.innerHTML = `
                <div class="book-item-title">${book.title}</div>
                <div class="book-item-author">${authors}</div>
            `;
            item.addEventListener("click", () => loadBook(book));
            bookList.appendChild(item);
        });
    }

    function updatePagination(totalPages) {
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    function updateBookHeader(book) {
        const titleParts = book.title.split(";");

        document.querySelector(".book-title").textContent = titleParts[0].trim();
        document.querySelector(".book-subtitle").textContent = titleParts[1] ? titleParts[1].trim() : "";

        const authors = book.authors.map((a) => a.name).join(", ") || "Unknown Author";

        document.querySelector(".book-author").textContent = `by ${authors}`;

        const bookUrl = document.querySelector(".book-url");
        bookUrl.href = `https://www.gutenberg.org/ebooks/${book.id}`;

        document.querySelector("header").classList.remove("hidden");
        document.querySelector("footer").classList.remove("hidden");
    }

    function getTextUrl(book) {
        return book.formats["text/plain; charset=utf-8"] ||
            book.formats["text/plain; charset=us-ascii"] ||
            book.formats["text/plain"] ||
            Object.entries(book.formats).find(([k]) => k.startsWith("text/plain"))?.[1];
    }

    function finishLoadingBook(text) {
        renderBookContent(text);

        bookLoading.classList.add("hidden");

        setTimeout(() => {
            const visibleText = getVisibleText();

            if (visibleText.length >= MIN_TEXT_LENGTH && apiKey) {
                currentImageHash = hashText(visibleText);

                generateImage(visibleText);
            }
        }, SCROLL_IDLE_TIME);
    }

    function showManualTextInput(book, textUrl) {
        pendingBook = book;
        pendingTextUrl = textUrl;
        manualTextInput.value = "";

        textInputOverlay.classList.remove("hidden");
    }

    async function loadBook(book) {
        bookSelectOverlay.classList.add("hidden");
        bookLoading.classList.remove("hidden");
        document.querySelector("main.book-content").innerHTML = '<p style="text-align:center;">Loading book...</p>';

        updateBookHeader(book);

        const textUrl = getTextUrl(book);

        if (!textUrl) {
            document.querySelector("main.book-content").innerHTML = '<p style="text-align:center;">No plain text version available for this book.</p>';
            bookLoading.classList.add("hidden");

            return;
        }

        try {
            const proxyUrl = `${LOCAL_PROXY_URL}?url=${encodeURIComponent(textUrl)}`;
            const response = await fetch(proxyUrl);

            if (!response.ok) {
                throw new Error(`Proxy error: ${response.status}`);
            }

            const text = await response.text();

            if (text.includes('"error"')) {
                throw new Error("Proxy returned error");
            }

            finishLoadingBook(text);
        } catch (error) {
            console.error("Local proxy failed:", error);

            bookLoading.classList.add("hidden");

            showManualTextInput(book, textUrl);
        }
    }

    openBookTabBtn.addEventListener("click", () => {
        if (pendingTextUrl) {
            window.open(pendingTextUrl, "_blank");
        }
    });

    cancelTextInputBtn.addEventListener("click", () => {
        textInputOverlay.classList.add("hidden");

        pendingBook = null;
        pendingTextUrl = null;

        bookSelectOverlay.classList.remove("hidden");
    });

    submitTextInputBtn.addEventListener("click", () => {
        const text = manualTextInput.value.trim();

        if (text.length < 100) {
            alert("Please paste at least 100 characters of book text.");

            return;
        }

        textInputOverlay.classList.add("hidden");

        if (pendingBook) {
            updateBookHeader(pendingBook);
        }

        finishLoadingBook(text);

        pendingBook = null;
        pendingTextUrl = null;
    });

    function renderBookContent(text) {
        const main = document.querySelector("main.book-content");

        // Remove Gutenberg header/footer
        const startMarkers = ["*** START OF THE PROJECT GUTENBERG", "*** START OF THIS PROJECT GUTENBERG"];
        const endMarkers = ["*** END OF THE PROJECT GUTENBERG", "*** END OF THIS PROJECT GUTENBERG", "End of the Project Gutenberg", "End of Project Gutenberg"];

        let content = text;

        for (const marker of startMarkers) {
            const idx = content.indexOf(marker);

            if (idx !== -1) {
                const lineEnd = content.indexOf("\n", idx);
                content = content.substring(lineEnd + 1);

                break;
            }
        }

        for (const marker of endMarkers) {
            const idx = content.indexOf(marker);

            if (idx !== -1) {
                content = content.substring(0, idx);

                break;
            }
        }

        // Split into paragraphs and render
        const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
        let html = "";

        paragraphs.forEach((para) => {
            const trimmed = para.trim();

            if (!trimmed) {
                return;
            }

            // Detect chapter headings
            if (/^(CHAPTER|BOOK|PART|SECTION)\s+[IVXLCDM\d]+/i.test(trimmed) || /^[IVXLCDM]+\.\s*$/i.test(trimmed)) {
                html += `<h2>${trimmed}</h2>`;
            } else if (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && !/[.!?]$/.test(trimmed)) {
                html += `<h3>${trimmed}</h3>`;
            } else {
                html += `<p>${trimmed.replace(/\n/g, " ")}</p>`;
            }
        });

        main.innerHTML = html;

        window.scrollTo(0, 0);
    }

    saveApiKeyBtn.addEventListener("click", () => {
        apiKey = apiKeyInput.value.trim();

        if (apiKey) {
            localStorage.setItem("openrouter_api_key", apiKey);
            apiKeyToggle.classList.remove("hidden");
            apiKeyPrompt.classList.add("hidden");
        } else {
            localStorage.removeItem("openrouter_api_key");
            apiKeyToggle.classList.add("hidden");
        }
    });

    apiKeyToggle.addEventListener("click", () => {
        apiKeyInput.value = apiKey;
        apiKeyPrompt.classList.remove("hidden");
    });

    // Get selected text if any
    function getSelectedText() {
        const selection = window.getSelection();

        if (selection && selection.toString().trim().length > 20) {
            return selection.toString().trim();
        }

        return null;
    }

    // Get visible text from the viewport
    function getVisibleText() {
        // First check if user has selected text
        const selectedText = getSelectedText();

        if (selectedText) {
            return selectedText.substring(0, 1500);
        }

        // Otherwise get visible paragraphs
        const paragraphs = document.querySelectorAll("main p, main h2, main h3");
        const viewportTop = window.scrollY;
        const viewportBottom = viewportTop + window.innerHeight;

        let visibleText = [];

        paragraphs.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const elTop = rect.top + window.scrollY;
            const elBottom = rect.bottom + window.scrollY;

            // Check if element is at least partially visible
            if (elBottom > viewportTop && elTop < viewportBottom) {
                visibleText.push(el.textContent.trim());
            }
        });

        return visibleText.join(" ").substring(0, 1500); // Limit to ~1500 chars
    }

    // Simple hash to detect if text changed significantly
    function hashText(text) {
        let hash = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }

        return hash;
    }

    // Generate image from text
    async function generateImage(text) {
        if (!apiKey) {
            apiKeyPrompt.classList.remove("hidden");

            return;
        }

        const prompt = `Create an illustration for this passage from book:

"${text.substring(0, 800)}"

Make it single-color (black on white) Renaissance-style engraved line illustration, da Vinci sketchbook aesthetic, fine pen-and-ink cross-hatching, contour line texture, woodcut etching look, black ink on white, no background, symmetrical composition, detailed shading built from line density, suitable for SVG tracing. No text, no labels, no captions, no drawn borders or frames. Just the subject free-floating, maybe with a subtle scene around them.`;

        try {
            isGenerating = true;
            loadingIndicator.classList.add("visible");

            const response = await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.5-flash-image",
                        messages: [{ role: "user", content: prompt }],
                        modalities: ["image", "text"],
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            // Find the image in the response
            const message = data.choices?.[0]?.message;
            const images = message?.images || [];

            if (images.length > 0) {
                const imageUrl = images[0].image_url?.url;

                if (imageUrl) {
                    const tempImg = new Image();

                    tempImg.onload = () => {
                        generatedImage.src = imageUrl;
                        document.body.classList.add("image-active");
                        generatedImage.classList.add("visible");
                        loadingIndicator.classList.remove("visible");
                    };

                    tempImg.src = imageUrl;

                    return;
                }
            }

            console.log("No image in response:", data);

            loadingIndicator.classList.remove("visible");
        } catch (error) {
            console.error("Image generation failed:", error);

            loadingIndicator.classList.remove("visible");
        } finally {
            isGenerating = false;
        }
    }

    // Handle scroll events
    function onScroll() {
        // Clear existing timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        // Set new timeout for when scrolling stops
        scrollTimeout = setTimeout(() => {
            if (isGenerating) {
                return;
            }

            const visibleText = getVisibleText();

            if (visibleText.length < MIN_TEXT_LENGTH) {
                return;
            }

            const textHash = hashText(visibleText);

            // Only generate if text changed significantly
            if (textHash !== currentImageHash) {
                currentImageHash = textHash;

                generateImage(visibleText);
            }
        }, SCROLL_IDLE_TIME);
    }

    // Debounced scroll listener
    let ticking = false;

    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                onScroll();
                ticking = false;
            });
            ticking = true;
        }
    });

})();
