# Gutenberg AI Illustrations

> Forked from [mrnugget/moby-dick](https://github.com/mrnugget/moby-dick)

An interactive reading experience that generates Renaissance-style illustrations for any public domain book from Project Gutenberg as you read.

**[Live Demo](https://arvislacis.github.io/gutenberg-ai-illustrations/)**

## How it works

1. Start the local proxy server (see below)
2. Open `http://localhost:8080/index.html` in your browser
3. Enter your [OpenRouter API key](https://openrouter.ai/settings/keys) when prompted
4. Search and select a book from Project Gutenberg's catalog
5. Read the book — after you stop scrolling for ~1 second, an illustration matching the visible text fades in on the right
6. Select specific text to generate an illustration for that passage
7. Scroll again and the image fades out

The illustrations are generated using the `google/gemini-2.5-flash-image` model via OpenRouter in a da Vinci sketchbook style — black ink engravings that blend with the page.

## Running the Local Proxy Server

The application requires a local PHP proxy server to fetch books from Project Gutenberg (to handle CORS restrictions).

```bash
cd gutenberg-ai-illustrations
php -S localhost:8080
```

Then open `http://localhost:8080/index.html` in your browser.

**Note:** If the proxy is unavailable, a fallback modal will appear allowing you to manually paste book text or open the book directly in a new tab.

## Features

- **Book Selection**: Browse and search Project Gutenberg's catalog using the Gutendex API
- **AI Illustrations**: Automatic Renaissance-style illustration generation as you read
- **Text Selection**: Select specific passages to generate targeted illustrations
- **Fallback Support**: Manual text input when proxy is unavailable

## Attribution

Book texts are in the public domain and sourced from [Project Gutenberg](https://www.gutenberg.org/).

## License

The code in this repository is released under the MIT License. Book texts from Project Gutenberg are in the public domain.
