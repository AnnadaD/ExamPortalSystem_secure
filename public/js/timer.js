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
      
      formElement.submit();
    }
  });
  
  // Track tab visibility changes (switching to other tabs/windows)
  let tabSwitchCount = 0;
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      tabSwitchCount++;
      
      // Log excessive tab switching (possible cheating attempt)
      if (tabSwitchCount >= 3) {
        const securityTabLog = document.createElement('input');
        securityTabLog.type = 'hidden';
        securityTabLog.name = 'tab_switch_count';
        securityTabLog.value = tabSwitchCount;
        document.getElementById('examForm').appendChild(securityTabLog);
      }
    }
  });
});
