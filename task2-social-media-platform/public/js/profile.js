// Profile Viewer and Bio Edit handler

document.addEventListener('DOMContentLoaded', () => {
  const profileHeaderCard = document.getElementById('profile-header-card');
  const userPostsStream = document.getElementById('user-posts-stream');

  const urlParams = new URLSearchParams(window.location.search);
  const targetUsername = urlParams.get('username');

  let currentUser = null;
  let targetUser = null;

  if (!targetUsername) {
    profileHeaderCard.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas fa-user-slash"></i></div>
        <h3>No Profile Selected</h3>
        <p>Return to the main feed to explore users.</p>
        <a href="/index.html" class="nav-btn nav-btn-solid mt-2"><i class="fas fa-home"></i> Go to Feed</a>
      </div>
    `;
    return;
  }

  async function initializeProfile() {
    try {
      // 1. Resolve Auth user
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      currentUser = authData.user;

      // 2. Fetch target user profile
      const res = await fetch(`/api/users/${targetUsername}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Profile not found.');
      }

      targetUser = data.user;
      renderProfileHeader();
      loadUserPosts();

    } catch (err) {
      console.error(err);
      profileHeaderCard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fas fa-exclamation-triangle" style="color: var(--error);"></i></div>
          <h3>Profile Error</h3>
          <p>${err.message}</p>
          <a href="/index.html" class="nav-btn nav-btn-solid mt-2"><i class="fas fa-arrow-left"></i> Back to Feed</a>
        </div>
      `;
    }
  }

  function renderProfileHeader() {
    const isOwnProfile = currentUser && currentUser.username === targetUser.username;
    
    profileHeaderCard.innerHTML = `
      <div class="profile-avatar-box">
        <img src="${targetUser.avatar_url}" alt="Profile Avatar" class="profile-avatar">
      </div>
      <div class="profile-meta-box">
        <div class="profile-username-row">
          <h2 class="profile-name">@${targetUser.username}</h2>
          ${!isOwnProfile && currentUser ? `
            <button class="nav-btn ${targetUser.is_following ? 'nav-btn-outline' : 'nav-btn-solid'}" id="profile-follow-toggle-btn">
              ${targetUser.is_following ? '<i class="fas fa-user-minus"></i> Unfollow' : '<i class="fas fa-user-plus"></i> Follow'}
            </button>
          ` : ''}
        </div>
        
        <div class="profile-stats-row">
          <span class="stat-item"><strong id="stat-posts">0</strong> posts</span>
          <span class="stat-item"><strong id="stat-followers">${targetUser.followers_count}</strong> followers</span>
          <span class="stat-item"><strong id="stat-following">${targetUser.following_count}</strong> following</span>
        </div>

        <p class="profile-bio" id="profile-bio-text">${targetUser.bio || 'No bio written yet.'}</p>
        
        ${isOwnProfile ? `
          <button class="edit-bio-btn" id="edit-bio-trigger-btn">
            <i class="far fa-edit"></i> Edit Bio
          </button>
          
          <div class="bio-editor-panel hidden" id="bio-editor-drawer">
            <textarea id="bio-edit-input" placeholder="Tell us about yourself...">${targetUser.bio || ''}</textarea>
            <div class="bio-editor-actions">
              <button class="nav-btn nav-btn-solid" id="bio-save-btn" style="padding: 6px 12px; font-size:12px;">Save</button>
              <button class="nav-btn nav-btn-outline" id="bio-cancel-btn" style="padding: 6px 12px; font-size:12px;">Cancel</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Bind event listeners
    if (!isOwnProfile && currentUser) {
      const followToggleBtn = document.getElementById('profile-follow-toggle-btn');
      followToggleBtn.addEventListener('click', async () => {
        try {
          const res = await fetch(`/api/users/${targetUser.id}/follow`, { method: 'POST' });
          const data = await res.json();

          if (!res.ok) {
            showToast(data.error || 'Failed to toggle follow.', 'error');
            return;
          }

          targetUser.is_following = data.is_following;
          
          // Re-render follow button state and count
          document.getElementById('stat-followers').textContent = data.followers_count;
          
          if (targetUser.is_following) {
            followToggleBtn.className = 'nav-btn nav-btn-outline';
            followToggleBtn.innerHTML = '<i class="fas fa-user-minus"></i> Unfollow';
            showToast('User followed!');
          } else {
            followToggleBtn.className = 'nav-btn nav-btn-solid';
            followToggleBtn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
            showToast('User unfollowed!');
          }

        } catch (err) {
          console.error(err);
        }
      });
    }

    if (isOwnProfile) {
      const editTrigger = document.getElementById('edit-bio-trigger-btn');
      const editorDrawer = document.getElementById('bio-editor-drawer');
      const bioText = document.getElementById('profile-bio-text');
      const bioSave = document.getElementById('bio-save-btn');
      const bioCancel = document.getElementById('bio-cancel-btn');
      const bioInput = document.getElementById('bio-edit-input');

      editTrigger.addEventListener('click', () => {
        editorDrawer.classList.remove('hidden');
        editTrigger.classList.add('hidden');
        bioText.classList.add('hidden');
        bioInput.focus();
      });

      bioCancel.addEventListener('click', () => {
        editorDrawer.classList.add('hidden');
        editTrigger.classList.remove('hidden');
        bioText.classList.remove('hidden');
        bioInput.value = targetUser.bio || '';
      });

      bioSave.addEventListener('click', async () => {
        const newBio = bioInput.value.trim();

        try {
          bioSave.disabled = true;
          bioSave.textContent = 'Saving...';

          const res = await fetch('/api/users/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio: newBio })
          });

          const data = await res.json();

          if (!res.ok) {
            showToast(data.error || 'Failed to update bio.', 'error');
            bioSave.disabled = false;
            bioSave.textContent = 'Save';
            return;
          }

          targetUser.bio = newBio;
          bioText.textContent = newBio || 'No bio written yet.';
          
          editorDrawer.classList.add('hidden');
          editTrigger.classList.remove('hidden');
          bioText.classList.remove('hidden');
          
          showToast('Profile bio updated!');
        } catch (err) {
          console.error(err);
          showToast('Error updating profile bio.', 'error');
        } finally {
          bioSave.disabled = false;
          bioSave.textContent = 'Save';
        }
      });
    }
  }

  // Load and Render Posts
  async function loadUserPosts() {
    try {
      userPostsStream.innerHTML = `
        <div class="text-center" style="padding: 40px 0;">
          <i class="fas fa-circle-notch fa-spin" style="font-size: 24px; color: var(--primary);"></i>
        </div>
      `;

      const res = await fetch(`/api/posts?username=${encodeURIComponent(targetUsername)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Update posts count stat in header
      const statPosts = document.getElementById('stat-posts');
      if (statPosts) {
        statPosts.textContent = data.posts.length;
      }

      if (data.posts.length === 0) {
        userPostsStream.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="far fa-edit"></i></div>
            <h3>No Posts Yet</h3>
            <p>@${targetUser.username} hasn't posted anything yet.</p>
          </div>
        `;
        return;
      }

      renderProfilePosts(data.posts);

    } catch (err) {
      console.error(err);
      userPostsStream.innerHTML = `
        <div class="empty-state">
          <p style="color:var(--error);">${err.message}</p>
        </div>
      `;
    }
  }

  function renderProfilePosts(posts) {
    userPostsStream.innerHTML = posts.map(post => {
      const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <article class="post-card">
          <div class="post-card-header">
            <img src="${post.avatar_url}" alt="Avatar" class="post-user-avatar">
            <div class="post-meta">
              <span class="post-username">@${post.username}</span>
              <span class="post-time">${formattedDate}</span>
            </div>
          </div>
          <div class="post-content">
            <p>${post.content}</p>
          </div>
          ${post.image_url ? `
            <div class="post-media-box">
              <img src="${post.image_url}" alt="Post image">
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
          
          <div class="comments-panel-drawer hidden" id="comments-drawer-${post.id}">
            <div class="comments-list" id="comments-list-${post.id}">
              <!-- Comments load dynamically -->
            </div>
            ${currentUser ? `
              <form class="comment-input-row comment-create-form" data-id="${post.id}">
                <input type="text" placeholder="Write a comment..." class="comment-text-input" required>
                <button type="submit" class="comment-submit-btn">Send</button>
              </form>
            ` : `
              <p style="font-size:12px; color:var(--text-muted); text-align:center;">
                <a href="/auth.html" style="color:var(--primary); font-weight:600;">Log in</a> to comment.
              </p>
            `}
          </div>
        </article>
      `;
    }).join('');

    // Wire up Likes and Comments event triggers inside profile feed (similar to feed.js)
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
        <i class="fas fa-circle-notch fa-spin" style="font-size: 14px; color: var(--primary);"></i>
      </div>
    `;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (data.comments.length === 0) {
        listEl.innerHTML = '<p style="font-size:11px; color:var(--text-muted); text-align:center; padding: 10px 0;">No comments yet.</p>';
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

      const form = document.querySelector(`.comment-create-form[data-id="${postId}"]`);
      if (form) {
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
          }
        };
      }

    } catch (err) {
      console.error(err);
      listEl.innerHTML = '<p style="font-size:11px; color:var(--error); text-align:center;">Failed to load comments.</p>';
    }
  }

  initializeProfile();
});
