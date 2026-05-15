// src/ui/components/modal.js
window.App = window.App || {};
App.ui = App.ui || {};

App.ui.createModal = function(title, content) {
    if (App.ui.currentModal) {
        App.ui.currentModal.remove();
        document.body.style.overflow = '';
        App.ui.currentModal = null;
    }

    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    var innerHtml =
        '<div class="modal-content">' +
            '<span class="close">&times;</span>' +
            '<h3 style="margin-top:0; margin-bottom:16px;">' + App.utils.escapeHtml(title) + '</h3>' +
            content +
        '</div>';

    modal.innerHTML = innerHtml;
    document.body.appendChild(modal);

    // Блокируем скролл фона
    document.body.style.overflow = 'hidden';

    // *** ПЕРЕОПРЕДЕЛЯЕМ remove, чтобы всегда сбрасывать overflow ***
    var origRemove = modal.remove;
    modal.remove = function() {
        document.body.style.overflow = '';
        if (App.ui.currentModal === modal) {
            App.ui.currentModal = null;
        }
        origRemove.call(this);
    };

    // Закрытие по крестику
    var closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.remove();   // теперь вызовет переопределённый метод
        };
    }

    // Закрытие по клику на оверлей
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Закрытие по Escape
    function escapeHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    }
    document.addEventListener('keydown', escapeHandler);

    App.ui.currentModal = modal;
    App.initIcons();

    // Прилепляем модалку к клавиатуре (мобильные)
    if (window.visualViewport && window.innerWidth < 768) {
        var contentEl = modal.querySelector('.modal-content');
        function adjustForKeyboard() {
            if (!modal.parentNode) return;
            var viewport = window.visualViewport;
            var bottomOffset = window.innerHeight - (viewport.height + viewport.offsetTop);
            if (bottomOffset > 0) {
                contentEl.style.transform = 'translateY(-' + bottomOffset + 'px)';
            } else {
                contentEl.style.transform = 'translateY(0)';
            }
        }
        window.visualViewport.addEventListener('resize', adjustForKeyboard);
        window.visualViewport.addEventListener('scroll', adjustForKeyboard);
        var observer = new MutationObserver(function() {
            if (!document.body.contains(modal)) {
                window.visualViewport.removeEventListener('resize', adjustForKeyboard);
                window.visualViewport.removeEventListener('scroll', adjustForKeyboard);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true });
    }

    return modal;
};