document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const prelaunchForm = document.getElementById('prelaunchForm');
  const emailInput = document.getElementById('emailInput');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnArrow = submitBtn.querySelector('.btn-arrow');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');
  const formFeedback = document.getElementById('formFeedback');
  const rolePills = document.querySelectorAll('.role-pill');
  const liveCounterText = document.getElementById('liveCounterText');

  // Modal Elements
  const vipModal = document.getElementById('vipModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const ticketQueueNumber = document.getElementById('ticketQueueNumber');
  const ticketRoleTag = document.getElementById('ticketRoleTag');
  const ticketVipCode = document.getElementById('ticketVipCode');
  const shareUrlInput = document.getElementById('shareUrlInput');
  const copyShareBtn = document.getElementById('copyShareBtn');

  // Interactive Live Demo Elements
  const chanBtns = document.querySelectorAll('.chan-btn');
  const demoStreamName = document.getElementById('demoStreamName');
  const demoListeners = document.getElementById('demoListeners');
  const heroLogoIcon = document.getElementById('heroLogoIcon');

  // FAQ Elements
  const faqItems = document.querySelectorAll('.faq-item');

  let selectedRole = 'Host';

  // Read URL query for referral tracking
  const urlParams = new URLSearchParams(window.location.search);
  const referralCodeFromUrl = urlParams.get('ref') || null;

  // 1. Role Selection
  rolePills.forEach(pill => {
    pill.addEventListener('click', () => {
      rolePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedRole = pill.getAttribute('data-role') || 'Host';
    });
  });

  // 2. Interactive Live Demo Channel Switcher
  chanBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chanBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const title = btn.getAttribute('data-title');
      const listeners = btn.getAttribute('data-listeners');
      const mode = btn.getAttribute('data-mode');

      if (demoStreamName) demoStreamName.textContent = title;
      if (demoListeners) demoListeners.textContent = listeners;

      if (heroLogoIcon) {
        if (mode === 'red') {
          heroLogoIcon.style.filter = 'drop-shadow(0 0 25px rgba(239, 68, 68, 0.7))';
        } else if (mode === 'blue') {
          heroLogoIcon.style.filter = 'drop-shadow(0 0 25px rgba(59, 130, 246, 0.7))';
        } else if (mode === 'green') {
          heroLogoIcon.style.filter = 'drop-shadow(0 0 25px rgba(16, 185, 129, 0.7))';
        } else {
          heroLogoIcon.style.filter = 'drop-shadow(0 0 25px rgba(0, 242, 254, 0.5))';
        }
      }
    });
  });

  // 3. Fetch Live Stats
  async function fetchLiveStats() {
    try {
      const res = await fetch('/api/prelaunch/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.stats && data.stats.total) {
          liveCounterText.textContent = `${data.stats.total.toLocaleString()}+ early adopters`;
        }
      }
    } catch (e) {
      // Keep static counter fallback
    }
  }
  fetchLiveStats();

  // 4. Form Submission Handler
  prelaunchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!email) return;

    // Platform selection
    const selectedPlatformEl = document.querySelector('input[name="platform"]:checked');
    const platform = selectedPlatformEl ? selectedPlatformEl.value : 'All';

    // UI Loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    if (btnArrow) btnArrow.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    formFeedback.style.display = 'none';

    try {
      const response = await fetch('/api/prelaunch/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: selectedRole,
          platform,
          ref: referralCodeFromUrl
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to register. Please try again.');
      }

      // Success UI
      formFeedback.className = 'form-feedback success';
      formFeedback.textContent = data.message || '🎉 VIP Pass secured!';
      formFeedback.style.display = 'block';

      // Open VIP Ticket Modal
      const subscriber = data.subscriber;
      ticketQueueNumber.textContent = `#${subscriber.queue_number}`;
      ticketRoleTag.textContent = `${subscriber.role.toUpperCase()} TIER`;
      
      const vipCode = `VIP-BC-${subscriber.queue_number}-${(subscriber.referral_code || 'BUD').slice(0, 4).toUpperCase()}`;
      if (ticketVipCode) ticketVipCode.textContent = vipCode;

      const shareUrl = `${window.location.origin}/landing/?ref=${subscriber.referral_code}`;
      shareUrlInput.value = shareUrl;

      setTimeout(() => {
        vipModal.style.display = 'flex';
      }, 300);

      // Refresh counter
      fetchLiveStats();

    } catch (err) {
      formFeedback.className = 'form-feedback error';
      formFeedback.textContent = err.message || 'Registration error. Please try again.';
      formFeedback.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      btnText.style.display = 'inline';
      if (btnArrow) btnArrow.style.display = 'inline';
      btnSpinner.style.display = 'none';
    }
  });

  // 5. Modal Close Handlers
  closeModalBtn.addEventListener('click', () => {
    vipModal.style.display = 'none';
  });

  window.addEventListener('click', (e) => {
    if (e.target === vipModal) {
      vipModal.style.display = 'none';
    }
  });

  // 6. Copy Referral Link
  copyShareBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrlInput.value);
      copyShareBtn.textContent = 'Copied! ✓';
      copyShareBtn.style.background = '#10B981';
      copyShareBtn.style.color = '#FFFFFF';
      setTimeout(() => {
        copyShareBtn.textContent = 'Copy Link';
        copyShareBtn.style.background = '';
        copyShareBtn.style.color = '';
      }, 2000);
    } catch {
      shareUrlInput.select();
      document.execCommand('copy');
      copyShareBtn.textContent = 'Copied!';
    }
  });

  // 7. FAQ Accordion
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
});
