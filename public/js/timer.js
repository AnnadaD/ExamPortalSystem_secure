document.addEventListener('DOMContentLoaded', function() {
  // Get timer element and form
  const timerElement = document.getElementById('timer');
  const formElement = document.getElementById('examForm');
  // Convert duration from minutes to seconds
  let timeLeft = duration * 60;
  
  // Initialize and display the timer
  updateTimerDisplay();
  
  // Start the countdown
  const countdown = setInterval(function() {
    timeLeft--;
    
    // Update timer display
    updateTimerDisplay();
    
    // Check if time is up
    if (timeLeft <= 0) {
      clearInterval(countdown);
      autoSubmitExam();
    }
    
    // Change color based on time remaining
    if (timeLeft <= 60) { // Last minute
      timerElement.parentElement.classList.add('bg-danger');
      timerElement.parentElement.classList.remove('bg-warning');
    } else if (timeLeft <= 300) { // Last 5 minutes
      timerElement.parentElement.classList.add('bg-warning');
      timerElement.parentElement.classList.remove('bg-primary');
    }
  }, 1000);
  
  // Format and update the timer display
  function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  
  // Auto-submit the exam when time expires
  function autoSubmitExam() {
    alert('Time is up! Your exam will be submitted automatically.');
    document.getElementById('examForm').submit();
  }
  
  // Also submit form when window is closed or navigated away from
  window.addEventListener('beforeunload', function(e) {
    // Cancel the event
    e.preventDefault();
    // Chrome requires returnValue to be set
    e.returnValue = 'Are you sure you want to leave? Your exam progress will be submitted.';
    
    // Auto-submit the form
    if (timeLeft > 0) {
      // Log navigation attempt for security monitoring
      const securityLog = document.createElement('input');
      securityLog.type = 'hidden';
      securityLog.name = 'security_event';
      securityLog.value = 'navigation_attempt';
      document.getElementById('examForm').appendChild(securityLog);
      
      // Note: actual form submission may not happen in modern browsers for security reasons
      // The server-side will still record the navigation attempt through the hidden field
      try {
        formElement.submit();
      } catch (err) {
        console.error('Form could not be auto-submitted:', err);
      }
    }
  });
  
  // Handle manual navigation attempts through clicks
  document.addEventListener('click', function(e) {
    // Check if the click is on a link that leads away from the exam
    const target = e.target.closest('a');
    if (target && !target.classList.contains('exam-link') && !e.ctrlKey && !e.metaKey) {
      // If it's a navigation link
      e.preventDefault();
      alert('Warning: Attempting to navigate away from the exam is logged and may be considered cheating.');
      
      // Log navigation attempt for security monitoring
      const securityLog = document.createElement('input');
      securityLog.type = 'hidden';
      securityLog.name = 'security_event';
      securityLog.value = 'navigation_attempt';
      document.getElementById('examForm').appendChild(securityLog);
    }
  });
  
  // Track tab visibility changes (switching to other tabs/windows)
  let tabSwitchCount = 0;
  let lastFocus = Date.now();
  
  // Track tab/window focus changes
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      tabSwitchCount++;
      lastFocus = Date.now();
      console.log('Tab switch detected: ' + tabSwitchCount);
      
      // Create or update the hidden field immediately on first switch
      updateTabSwitchField();
      
      // Display warning to the user
      if (tabSwitchCount === 1) {
        alert('Warning: Switching tabs during the exam is monitored and may be considered cheating.');
      }
    }
  });
  
  // Track focus/blur events as a backup method
  window.addEventListener('blur', function() {
    // Only count as a new switch if it's been at least 1 second since the last focus change
    if (Date.now() - lastFocus > 1000) {
      tabSwitchCount++;
      lastFocus = Date.now();
      console.log('Window blur detected: ' + tabSwitchCount);
      
      // Create or update the hidden field
      updateTabSwitchField();
    }
  });
  
  // Helper function to update the tab switch count field
  function updateTabSwitchField() {
    // Check if field already exists
    let securityTabLog = document.querySelector('input[name="tab_switch_count"]');
    
    if (securityTabLog) {
      // Update existing field
      securityTabLog.value = tabSwitchCount;
    } else {
      // Create new field
      securityTabLog = document.createElement('input');
      securityTabLog.type = 'hidden';
      securityTabLog.name = 'tab_switch_count';
      securityTabLog.value = tabSwitchCount;
      document.getElementById('examForm').appendChild(securityTabLog);
    }
    
    // Auto-submit after 3 switches
    if (tabSwitchCount >= 3) {
      alert('Warning: Multiple tab switches detected. This has been logged as a potential security violation.');
    }
  }
});
