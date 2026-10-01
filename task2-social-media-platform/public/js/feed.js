// Feed Stream and Post Creation logic

document.addEventListener('DOMContentLoaded', () => {
  const creatorBox = document.getElementById('creator-box');
  const creatorAvatar = document.getElementById('creator-user-avatar');
  const postCreateForm = document.getElementById('post-create-form');
  const postContentInput = document.getElementById('post-content-input');
  const postMediaSelect = document.getElementById('post-media-select');
  
  const feedStream = document.getElementById('feed-stream');
  const filterAll = document.getElementById('filter-all');
  const filterFollowing = document.getElementById('filter-following');
  const recommendationsBox = document.getElementById('recommendations-box');

  let currentUser = null;
  let feedType = 'all'; // 'all' or 'following'

  async function initializeFeed() {
    // 1. Resolve Auth User
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      currentUser = data.user;

      if (currentUser) {
        // Logged in, show creator box and load profile details for avatar
        creatorBox.classList.remove('hidden');
        
        const profileRes = await fetch(`/api/users/${currentUser.username}`);
        const profileData = await profileRes.json();
        if (profileRes.ok) {
          creatorAvatar.src = profileData.user.avatar_url;
        }

        loadRecommendations();
      } else {
        // Guest, hide follow sidebar recommendations or show sign-in prompt
        recommendationsBox.innerHTML = `
          <div class="empty-state">
            <p style="font-size: 13px; color: var(--text-muted);">Log in to view user recommendations.</p>
          </div>
        `;
      }
    } catch (err) {
      console.error(err);
    }

    // 2. Load Posts
    loadFeed();
  }

  // Load User Recommendations
  async function loadRecommendations() {
    try {
      const res = await fetch('/api/users/recommendations');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (data.recommendations.length === 0) {
        recommendationsBox.innerHTML = `
          <div class="empty-state">
            <p style="font-size: 13px; color: var(--text-muted);">No new recommendations.</p>
          </div>
        `;
        return;
      }

      recommendationsBox.innerHTML = data.recommendations.map(rec => `
        <div class="rec-user-row" id="rec-row-${rec.id}">
          <div class="rec-user-info">
            <a href="/profile.html?username=${rec.username}">
              <img src="${rec.avatar_url || '/images/avatar_default.jpg'}" alt="Avatar" class="comment-avatar" style="width:34px; height:34px;">
            </a>
            <div>
              <div class="rec-username"><a href="/profile.html?username=${rec.username}">@${rec.username}</a></div>
              <div class="rec-bio-snippet">${rec.bio || 'No bio written.'}</div>
            </div>
          </div>
          <button class="follow-btn follow-toggle-btn" data-id="${rec.id}">Follow</button>
        </div>
      `).join('');

      // Wire up follow recommendations toggle
      document.querySelectorAll('.follow-toggle-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const userId = parseInt(btn.dataset.id);
          try {
            const followRes = await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
            const followData = await followRes.json();

            if (!followRes.ok) {
              showToast(followData.error || 'Failed to follow user.', 'error');
              return;
            }

            showToast(followData.is_following ? 'User followed!' : 'User unfollowed!');
            
            // Remove row from recommendations list
            const row = document.getElementById(`rec-row-${userId}`);
            if (row) row.remove();

            // Refresh feed if viewing following
            if (feedType === 'following') {
              loadFeed();
            }
          } catch (err) {
            console.error(err);
            showToast('Failed to toggle follow.', 'error');
          }
        });
      });

    } catch (err) {
      console.error(err);
      recommendationsBox.innerHTML = '<p style="font-size:12px; color:var(--error);">Failed to load recommendations.</p>';
    }
  }

  // Fetch and Render Posts
  async function loadFeed() {
    try {
      feedStream.innerHTML = `
        <div class="text-center" style="padding: 40px 0;">
          <i class="fas fa-circle-notch fa-spin" style="font-size: 32px; color: var(--primary);"></i>
          <p style="margin-top: 10px; color: var(--text-secondary);">Loading feed posts...</p>
        </div>
      `;

      let url = '/api/posts';
      if (feedType === 'following') {
        url += '?feed=following';
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 && feedType === 'following') {
          feedStream.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon"><i class="fas fa-lock"></i></div>
              <h3>Following Feed Secured</h3>
              <p>Please log in to see updates from profiles you follow.</p>
              <a href="/auth.html" class="nav-btn nav-btn-solid mt-2"><i class="fas fa-sign-in-alt"></i> Login Now</a>
            </div>
          `;
          return;
        }
        throw new Error(data.error);
      }

      if (data.posts.length === 0) {
        feedStream.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fas fa-comments"></i></div>
            <h3>No Posts Yet</h3>
            <p>${feedType === 'following' ? 'Posts from users you follow will appear here. Start following users!' : 'Explore feed is quiet today. Create a post!'}</p>
          </div>
        `;
        return;
      }

      renderFeedPosts(data.posts);

    } catch (err) {
      console.error(err);
      feedStream.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-exclamation-triangle" style="color:var(--error);"></i></div>
          <h3>Failed to load feed</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  function renderFeedPosts(posts) {
    feedStream.innerHTML = posts.map(post => {
      const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <article class="post-card" id="post-card-${post.id}">
          <div class="post-card-header">
            <img src="${post.avatar_url}" alt="Avatar" class="post-user-avatar" onclick="window.location.href='/profile.html?username=${post.username}'">
            <div class="post-meta">
              <span class="post-username" onclick="window.location.href='/profile.html?username=${post.username}'">@${post.username}</span>
              <span class="post-time">${formattedDate}</span>
            </div>
          </div>
          <div class="post-content">
            <p>${post.content}</p>
          </div>
          ${post.image_url ? `
            <div class="post-media-box">
              <img src="${post.image_url}" alt="Post attachment">
            </div>
          ` : ''}
          <div class="post-actions">
            <button class="action-trigger like-trigger-btn ${post.has_liked ? 'liked' : ''}" data-id="${post.id}">
              <i class="${post.has_liked ? 'fas' : 'far'} fa-heart"></i>
              <span class="like-count">${post.likes_count}</span>
            </button>
            <button class="action-trigger comment-trigger-btn" data-id="${post.id}">
              <i class="far fa-comment"></i>
              <span>${post.comments_count}</span>
            </button>
          </div>
          
          <!-- Expandable comment drawer -->
          <div class="comments-panel-drawer hidden" id="comments-drawer-${post.id}">
            <div class="comments-list" id="comments-list-${post.id}">
              <!-- Comments load dynamically here -->
            </div>
            ${currentUser ? `
              <form class="comment-input-row comment-create-form" data-id="${post.id}">
                <input type="text" placeholder="Write a comment..." class="comment-text-input" required>
                <button type="submit" class="comment-submit-btn">Send</button>
              </form>
            ` : `
              <p style="font-size:12px; color:var(--text-muted); text-align:center;">
                <a href="/auth.html" style="color:var(--primary); font-weight:600;">Log in</a> to comment on this post.
              </p>
            `}
          </div>
        </article>
      `;
    }).join('');

    // Setup action triggers
    document.querySelectorAll('.like-trigger-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!currentUser) {
          showToast('You must log in to like posts.', 'error');
          return;
        }

        const postId = parseInt(btn.dataset.id);
        try {
          const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
          const data = await res.json();

          if (!res.ok) {
            showToast(data.error || 'Failed to toggle like.', 'error');
            return;
          }

          const likeCountEl = btn.querySelector('.like-count');
          const heartIcon = btn.querySelector('i');
          
          likeCountEl.textContent = data.likes_count;
          if (data.has_liked) {
            btn.classList.add('liked');
            heartIcon.className = 'fas fa-heart';
          } else {
            btn.classList.remove('liked');
            heartIcon.className = 'far fa-heart';
          }

        } catch (err) {
          console.error(err);
        }
      });
    });

    document.querySelectorAll('.comment-trigger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const postId = parseInt(btn.dataset.id);
        const drawer = document.getElementById(`comments-drawer-${postId}`);
        
        if (drawer.classList.contains('hidden')) {
          drawer.classList.remove('hidden');
          loadComments(postId);
        } else {
          drawer.classList.add('hidden');
        }
      });
    });
  }

  // Load comments
  async function loadComments(postId) {
    const listEl = document.getElementById(`comments-list-${postId}`);
    listEl.innerHTML = `
      <div class="text-center" style="padding: 10px 0;">
        <i class="fas fa-circle-notch fa-spin" style="font-size: 16px; color: var(--primary);"></i>
      </div>
    `;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (data.comments.length === 0) {
        listEl.innerHTML = '<p style="font-size:11px; color:var(--text-muted); text-align:center; padding: 10px 0;">No comments yet. Be the first to reply!</p>';
        return;
      }

      listEl.innerHTML = data.comments.map(c => `
        <div class="comment-row">
          <img src="${c.avatar_url}" alt="Commenter Avatar" class="comment-avatar">
          <div class="comment-bubble">
            <div class="comment-user">@${c.username}</div>
            <div class="comment-text">${c.content}</div>
          </div>
        </div>
      `).join('');

      listEl.scrollTop = listEl.scrollHeight;

      // Handle comment creation form submission
      const form = document.querySelector(`.comment-create-form[data-id="${postId}"]`);
      if (form) {
        // Clear previous event listener
        form.onsubmit = async (e) => {
          e.preventDefault();
          const input = form.querySelector('.comment-text-input');
          const content = input.value.trim();
          if (!content) return;

          try {
            const commentRes = await fetch(`/api/posts/${postId}/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content })
            });
            const commentData = await commentRes.json();

            if (!commentRes.ok) {
              showToast(commentData.error || 'Failed to submit comment.', 'error');
              return;
            }

            input.value = '';
            loadComments(postId);
            showToast('Comment posted!');
          } catch (err) {
            console.error(err);
            showToast('Error posting comment.', 'error');
          }
        };
      }

    } catch (err) {
      console.error(err);
      listEl.innerHTML = '<p style="font-size:11px; color:var(--error); text-align:center;">Failed to load comments.</p>';
    }
  }

  // Handle Post Creation
  postCreateForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const content = postContentInput.value.trim();
    const image_url = postMediaSelect.value;

    if (!content) {
      showToast('Post content cannot be empty.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, image_url })
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to publish post.', 'error');
        return;
      }

      postContentInput.value = '';
      postMediaSelect.value = '';

      showToast('Post published successfully!');
      
      // Reload feed to display new post at top
      loadFeed();

    } catch (err) {
      console.error(err);
      showToast('Network error while publishing post.', 'error');
    }
  });

  // Filter Event Listeners
  filterAll.addEventListener('click', () => {
    if (feedType === 'all') return;
    feedType = 'all';
    filterAll.classList.add('active');
    filterFollowing.classList.remove('active');
    loadFeed();
  });

  filterFollowing.addEventListener('click', () => {
    if (feedType === 'following') return;
    feedType = 'following';
    filterFollowing.classList.add('active');
    filterAll.classList.remove('active');
    loadFeed();
  });

  // Boot
  initializeFeed();
});
