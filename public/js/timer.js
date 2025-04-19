document.addEventListener('DOMContentLoaded', function() {
  // Get timer element
  const timerElement = document.getElementById('timer');
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
      formElement.submit();
    }
  });
});
