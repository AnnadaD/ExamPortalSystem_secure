document.addEventListener('DOMContentLoaded', function() {
  // Demonstrate XSS vulnerability
  const bioTextarea = document.getElementById('bio');
  const bioDemo = document.querySelector('.xss-demo');
  
  if (bioTextarea && bioDemo) {
    // Add example XSS payloads that can be clicked to insert
    const examples = [
      {
        name: "Text formatting",
        code: "<b>Bold text</b> and <i>italic text</i>"
      },
      {
        name: "Simple Alert",
        code: "<script>alert('XSS Attack!');</script>"
      },
      {
        name: "Colored Text",
        code: "<span style='color:red'>This text is red!</span>"
      },
      {
        name: "Image Injection",
        code: "<img src='x' onerror='alert(\"XSS via image\")'>"
      }
    ];
    
    // Create buttons for the examples
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mt-3';
    buttonContainer.innerHTML = '<p>Click to insert example payloads:</p>';
    
    examples.forEach(example => {
      const button = document.createElement('button');
      button.textContent = example.name;
      button.className = 'btn btn-sm btn-outline-secondary me-2 mb-2';
      button.addEventListener('click', function() {
        bioTextarea.value = example.code;
      });
      
      buttonContainer.appendChild(button);
    });
    
    bioDemo.appendChild(buttonContainer);
  }
});
