const menu = document.querySelector('#mobile-menu');
const menuLinks = document.querySelector('.navbar__menu');

menu.addEventListener('click', function() {
    menu.classList.toggle('is-active');
    menuLinks.classList.toggle('active');
});

document.querySelectorAll('.navbar__links, .navbar__btn .button').forEach(link => {
    link.addEventListener('click', () => {
        menu.classList.remove('is-active');
        menuLinks.classList.remove('active');
    });
});

// Demo board — freely movable, no game-over/legality gating beyond chess.js's own move validation
window.addEventListener('DOMContentLoaded', function() {
    const game = new Chess();

    const config = {
        draggable: true,
        position: 'start',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        onDrop,
        onSnapEnd
    };

    const board = Chessboard('board', config);

    function onDrop(source, target) {
        const move = game.move({ from: source, to: target, promotion: 'q' });
        if (move === null) return 'snapback';
    }

    function onSnapEnd() {
        board.position(game.fen());
    }

    window.addEventListener('resize', () => board.resize());
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

// Highlight the current page in the nav
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar__links');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
});
