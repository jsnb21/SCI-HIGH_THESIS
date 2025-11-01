let currentlyVisible = 5;
let isLoading = false;

function initializeNewsPagination() {
  const newsGrid = document.getElementById('news-grid');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const loadStatus = document.getElementById('load-status');
  const noMoreArticles = document.getElementById('no-more-articles');
  if (!newsGrid) return;

  const allArticles = Array.from(newsGrid.querySelectorAll('article.news-card'));
  const totalArticles = allArticles.length;

  function updateVisibleArticles() {
    allArticles.forEach((article, index) => {
      if (index < currentlyVisible) {
        article.style.display = 'block';
        article.style.animationDelay = `${index * 0.1}s`;
      } else {
        article.style.display = 'none';
      }
    });
    if (loadMoreBtn) {
      if (currentlyVisible >= totalArticles) {
        loadMoreBtn.style.display = 'none';
        noMoreArticles && noMoreArticles.classList.remove('hidden');
      } else {
        loadMoreBtn.style.display = 'inline-flex';
        noMoreArticles && noMoreArticles.classList.add('hidden');
      }
    }
  }

  function loadMoreArticles() {
    if (isLoading || currentlyVisible >= totalArticles) return;
    isLoading = true;
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = '<span class="mr-3">⏳</span>Loading...<span class="ml-3">⏳</span>';
    }
    loadStatus && loadStatus.classList.remove('hidden');

    setTimeout(() => {
      const previousVisible = currentlyVisible;
      currentlyVisible = Math.min(currentlyVisible + 5, totalArticles);
      for (let i = previousVisible; i < currentlyVisible; i++) {
        if (allArticles[i]) {
          allArticles[i].style.display = 'block';
          allArticles[i].style.animationDelay = `${(i - previousVisible) * 0.1}s`;
          allArticles[i].style.opacity = '0';
          allArticles[i].style.transform = 'translateY(30px)';
          setTimeout(() => {
            allArticles[i].style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            allArticles[i].style.opacity = '1';
            allArticles[i].style.transform = 'translateY(0)';
          }, (i - previousVisible) * 100);
        }
      }
      updateVisibleArticles();
      loadStatus && loadStatus.classList.add('hidden');
      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        if (currentlyVisible >= totalArticles) {
          loadMoreBtn.style.display = 'none';
          noMoreArticles && noMoreArticles.classList.remove('hidden');
        } else {
          loadMoreBtn.innerHTML = '<span class="mr-3">📰</span>Load More Articles<span class="ml-3">↓</span>';
        }
      }
      isLoading = false;
      if (allArticles[previousVisible]) {
        setTimeout(() => {
          allArticles[previousVisible].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }, 800);
  }

  updateVisibleArticles();
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreArticles);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeNewsPagination, 100);
});
