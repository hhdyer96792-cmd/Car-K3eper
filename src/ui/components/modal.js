// src/ui/components/modal.js
window.App = window.App || {};
App.ui = App.ui || {};

/**
 * Создаёт модальное окно, автоматически выбирая центрированное (десктоп) или bottom sheet (мобильные).
 * На десктопе (>768px) — центрированное окно с анимацией scale.
 * На мобильных — bottom sheet, выезжающий снизу.
 * @param {string} title - Заголовок
 * @param {string} content - HTML-содержимое
 * @returns {HTMLElement} DOM-элемент модального окна
 */
App.ui.createModal = function(title, content) {
    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    // Внутренняя часть (всегда modal-content)
    var innerHtml =
        '<div class="modal-content">' +
            '<span class="close">&times;</span>' +
            '<h3 style="margin-top:0; margin-bottom:16px;">' + App.utils.escapeHtml(title) + '</h3>' +
            content +
        '</div>';

    // На мобильных не добавляем дополнительную обёртку, т.к. modal-content уже стилизован как bottom sheet через медиа-запрос.
    // Но для обратной совместимости оставим возможность переопределить.
    if (window.innerWidth < 768) {
        // Можно оставить как есть, стили применятся через CSS
    }

    modal.innerHTML = innerHtml;
    document.body.appendChild(modal);

    // Блокируем скролл фона
    document.body.style.overflow = 'hidden';

    // Закрытие по крестику
    var closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            closeModal(modal);
        };
    }

    // Закрытие по клику на оверлей (сам modal)
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(modal);
        }
    });

    // Закрытие по Escape
    function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeModal(modal);
            document.removeEventListener('keydown', escapeHandler);
        }
    }
    document.addEventListener('keydown', escapeHandler);

    // Плавное закрытие с анимацией
    function closeModal(modalEl) {
        modalEl.style.opacity = '0';
        var contentEl = modalEl.querySelector('.modal-content');
        if (contentEl) {
            if (window.innerWidth < 768) {
                contentEl.style.transform = 'translateY(100%)';
            } else {
                contentEl.style.transform = 'scale(0.96)';
            }
        }
        setTimeout(function() {
            if (modalEl.parentNode) {
                modalEl.remove();
                document.body.style.overflow = '';
            }
        }, 250);
    }

    // Инициализируем иконки внутри модалки
App.initIcons();

// Прилепляем модалку к клавиатуре (мобильные)
if (window.visualViewport && window.innerWidth < 768) {
    var content = modal.querySelector('.modal-content');
    function adjustForKeyboard() {
        if (!modal.parentNode) return;
        var viewport = window.visualViewport;
        var bottomOffset = window.innerHeight - (viewport.height + viewport.offsetTop);
        if (bottomOffset > 0) {
            // Клавиатура открыта — поднимаем модалку ровно на высоту клавиатуры
            content.style.transform = 'translateY(-' + bottomOffset + 'px)';
        } else {
            // Клавиатура скрыта — возвращаем на место
            content.style.transform = 'translateY(0)';
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