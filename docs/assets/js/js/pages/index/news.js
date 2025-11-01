// Latest news loader extracted from inline script
(function(){
  async function loadLatestNews() {
    try {
      const response = await fetch('./news.html');
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const articles = doc.querySelectorAll('article.news-card');
      const latestArticles = Array.from(articles).slice(0, 2);
      const container = document.getElementById('latest-news-container');
      if (!container) return;
      if (latestArticles.length === 0) {
        container.innerHTML = `
          <div class="col-span-2 text-center py-8">
            <div class="text-gray-400 font-gaming">No news articles found.</div>
          </div>
        `;
        return;
      }
      const newsHTML = latestArticles.map(article => {
        const dateElement = article.querySelector('.text-gray-400');
        const titleElement = article.querySelector('h2');
        const contentElement = article.querySelector('p');
        const tagsElements = article.querySelectorAll('.bg-primary\\/20, .bg-cyan\\/20, .bg-purple\\/20, .bg-accent\\/20');
        const newBadge = article.querySelector('.badge-new, [class*="badge-new"]');
        const date = dateElement ? dateElement.textContent.trim() : 'Recent';
        const title = titleElement ? titleElement.textContent.trim() : 'News Update';
        let content = contentElement ? contentElement.textContent.trim() : 'Click to read more...';
        if (content.length > 150) content = content.substring(0, 150) + '...';
        const tags = Array.from(tagsElements).map(tag => ({ text: tag.textContent.trim(), classes: tag.className }));
        const isNew = newBadge !== null;
        return `
          <article class="neon-border bg-cardBg rounded-xl p-6 sm:p-8 backdrop-blur-sm transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div class="flex flex-wrap items-center gap-3 mb-4">
              ${isNew ? '<span class="badge-new bg-primary text-dark text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">New</span>' : ''}
              <span class="text-gray-400 text-sm font-gaming">${date}</span>
            </div>
            <h3 class="font-gaming text-xl sm:text-2xl font-bold text-primary mb-4 leading-tight">
              ${title}
            </h3>
            <p class="text-gray-300 leading-relaxed mb-6">
              ${content}
            </p>
            <div class="flex flex-wrap gap-2 mb-4">
              ${tags.map(tag => `<span class="${tag.classes} px-2 py-1 rounded text-sm">${tag.text}</span>`).join('')}
            </div>
            <a href="./news.html" class="inline-flex items-center text-primary hover:text-accent transition-colors duration-300 font-gaming text-sm uppercase tracking-wider">
              Read More <span class="ml-2">→</span>
            </a>
          </article>
        `;
      }).join('');
      container.innerHTML = newsHTML;
    } catch (error) {
      console.error('Error loading latest news:', error);
      const container = document.getElementById('latest-news-container');
      if (container) {
        container.innerHTML = `
          <div class="col-span-2 text-center py-8">
            <div class="text-red-400 font-gaming">Error loading news. Please try again later.</div>
          </div>
        `;
      }
    }
  }
  document.addEventListener('DOMContentLoaded', loadLatestNews);
})();
