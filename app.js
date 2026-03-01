// Mobile menu functionality
const menu = document.querySelector('#mobile-menu');
const menuLinks = document.querySelector('.navbar__menu');

// Toggle mobile menu
menu.addEventListener('click', function() {
    menu.classList.toggle('is-active');
    menuLinks.classList.toggle('active');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.navbar__links, .navbar__btn .button').forEach(link => {
    link.addEventListener('click', () => {
        menu.classList.remove('is-active');
        menuLinks.classList.remove('active');
    });
});

// Demo board functionality
window.addEventListener('DOMContentLoaded', function() {
    // Initialize the chess game
    const game = new Chess();
    
    // Configuration for the demo board
    const config = {
        draggable: true,
        position: 'start',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    };
    
    // Initialize the board
    const board = Chessboard('board', config);
    
    // Prevent picking up pieces if the game is over
    function onDragStart(source, piece) {
        // Allow any piece to be moved (for demonstration purposes)
        return true;
    }
    
    // Handle the piece drop
    function onDrop(source, target) {
        // Make the move
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q' // Always promote to queen
        });
        
        // If illegal move, snap back
        if (move === null) return 'snapback';
    }
    
    // Update the board position
    function onSnapEnd() {
        board.position(game.fen());
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        board.resize();
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            menu.classList.remove('is-active');
            menuLinks.classList.remove('active');
        }
    });
});

// Contact Form
const contactForm = document.querySelector('#contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.querySelector('#name').value,
            email: document.querySelector('#email').value,
            message: document.querySelector('#message').value
        };
        
        // Here you would typically send the form data to a server
        // For now, we'll just log it and show a success message
        console.log('Form submitted:', formData);
        alert('Thank you for your message! I will get back to you soon.');
        contactForm.reset();
    });
}

// Add active class to current page link
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar__links');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});
