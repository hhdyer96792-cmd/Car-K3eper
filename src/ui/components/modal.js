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

    document.body.style.overflow = 'hidden';

    var origRemove = modal.remove;
    modal.remove = function() {
        document.body.style.overflow = '';
        if (App.ui.currentModal === modal) {
            App.ui.currentModal = null;
        }
        origRemove.call(this);
    };

    var closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.remove();
        };
    }

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    function escapeHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    }
    document.addEventListener('keydown', escapeHandler);

    App.ui.currentModal = modal;
    App.initIcons();

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

/**
 * Показывает модальное окно подтверждения и вызывает callback при согласии.
 * @param {string} message - текст вопроса
 * @param {function} onConfirm - функция, вызываемая при ответе «Да»
 */
App.ui.confirmModal = function(message, onConfirm) {
    var content = '<p style="margin-bottom:16px;">' + App.utils.escapeHtml(message) + '</p>' +
        '<div class="modal-actions" style="display:flex; gap:8px; justify-content:center;">' +
            '<button id="confirm-yes-btn" class="primary-btn">Да</button>' +
            '<button id="confirm-no-btn" class="secondary-btn">Нет</button>' +
        '</div>';
    var modal = App.ui.createModal('Подтверждение', content);
    document.getElementById('confirm-yes-btn').addEventListener('click', function() {
        modal.remove();
        if (typeof onConfirm === 'function') onConfirm();
    });
    document.getElementById('confirm-no-btn').addEventListener('click', function() {
        modal.remove();
    });
};

/**
 * Показывает модальное окно с полем ввода и вызывает callback с введённым значением.
 * @param {string} title - заголовок
 * @param {string} defaultValue - начальное значение
 * @param {function} onSubmit - функция, принимающая введённую строку
 */
App.ui.promptModal = function(title, defaultValue, onSubmit) {
    var content = '<input type="text" id="prompt-input" value="' + App.utils.escapeHtml(defaultValue || '') + '" style="margin-bottom:16px;">' +
        '<div class="modal-actions" style="display:flex; gap:8px; justify-content:flex-end;">' +
            '<button id="prompt-ok-btn" class="primary-btn">ОК</button>' +
            '<button id="prompt-cancel-btn" class="secondary-btn">Отмена</button>' +
        '</div>';
    var modal = App.ui.createModal(title, content);
    var input = document.getElementById('prompt-input');
    input.focus();
    input.select();
    document.getElementById('prompt-ok-btn').addEventListener('click', function() {
        modal.remove();
        if (typeof onSubmit === 'function') onSubmit(input.value);
    });
    document.getElementById('prompt-cancel-btn').addEventListener('click', function() {
        modal.remove();
    });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('prompt-ok-btn').click();
        }
    });
};

/**
 * Показывает информационное модальное окно с кнопкой «ОК».
 * @param {string} message - текст сообщения
 */
App.ui.alertModal = function(message) {
    var content = '<p style="margin-bottom:16px; white-space:pre-wrap;">' + App.utils.escapeHtml(message) + '</p>' +
        '<div class="modal-actions" style="display:flex; gap:8px; justify-content:center;">' +
            '<button id="alert-ok-btn" class="primary-btn">ОК</button>' +
        '</div>';
    var modal = App.ui.createModal('Информация', content);
    document.getElementById('alert-ok-btn').addEventListener('click', function() {
        modal.remove();
    });
};