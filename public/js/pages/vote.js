// public/js/pages/vote.js
(async function () {
  const el = (id) => document.getElementById(id);

  // Ensure Auth object and PageUtils are available
  if (!window.Auth || typeof Auth.getUser !== "function" || !window.PageUtils || typeof PageUtils.fetchJson !== "function") {
    console.error("Auth or PageUtils not loaded. Ensure public/js/auth.js and public/js/page-utils.js are included.");
    Auth.logout();
    return;
  }

  Auth.requireLogin();
  const user = Auth.getUser(); // Get user from client-side decoded token

  if (!user) {
    Auth.logout();
    return;
  }

  const voteContainer = el("voteContainer");

  async function loadElections() {
    voteContainer.innerHTML = '<div class="muted small">Loading ballots…</div>';
    try {
      // ✅ Use PageUtils.fetchJson
      const elections = await PageUtils.fetchJson("/api/ssg/elections", { method: 'GET' });

      if (!elections || elections.length === 0) {
        voteContainer.innerHTML = '<div class="muted small">No active elections found.</div>';
        return;
      }

      voteContainer.innerHTML = '';
      elections.forEach(election => {
        // Check if the user has already voted in this election
        const hasVoted = election.voters && election.voters.includes(user.id);

        const ballotDiv = document.createElement('div');
        ballotDiv.className = 'ballot';
        ballotDiv.innerHTML = `
          <h3 class="ballot-title">${PageUtils.escapeHtml(election.title)}</h3>
          <p class="ballot-desc">${PageUtils.escapeHtml(election.description || 'No description.')}</p>
          <div class="candidate-list" id="candidates-${election._id}">
            ${election.candidates.map(candidate => `
              <div class="candidate">
                <span class="candidate-name">${PageUtils.escapeHtml(candidate.fullName)} (${PageUtils.escapeHtml(candidate.position)})</span>
                <button class="vote-btn" data-election-id="${election._id}" data-candidate-id="${candidate._id}" ${hasVoted ? 'disabled' : ''}>
                  ${hasVoted ? 'Voted' : 'Vote'}
                </button>
              </div>
            `).join('')}
          </div>
          ${hasVoted ? '<div class="voted" style="margin-top:10px; text-align:center;">You have already voted in this election.</div>' : ''}
        `;
        voteContainer.appendChild(ballotDiv);
      });

      // Attach event listeners to vote buttons
      voteContainer.querySelectorAll('.vote-btn').forEach(button => {
        if (!button.disabled) { // Only attach if not already voted
          button.addEventListener('click', async (event) => {
            const electionId = event.target.dataset.electionId;
            const candidateId = event.target.dataset.candidateId;

            if (confirm('Are you sure you want to cast your vote? This cannot be undone.')) {
              try {
                // ✅ Use PageUtils.fetchJson
                await PageUtils.fetchJson("/api/ssg/vote", {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ electionId, candidateId })
                });
                showToast('Vote cast successfully!', 'success');
                loadElections(); // Reload elections to update UI (show "Voted" status)
              } catch (err) {
                console.error('Error casting vote:', err);
                showToast('Failed to cast vote: ' + (err.message || err), 'error');
              }
            }
          });
        }
      });

    } catch (err) {
      console.error("Error loading elections:", err);
      voteContainer.innerHTML = '<div class="muted small">Failed to load elections.</div>';
    }
  }

  el("logoutBtn")?.addEventListener("click", () => {
    Auth.logout(); // ✅ Use Auth.logout()
  });

  loadElections();
})();
