// src/main.js
(function() {
    var isLoggedIn = false;
    var deferredPrompt = null;

    function setInstallButtonVisible(visible) {
        var installBtn = document.getElementById('pwa-install-btn');
        if (!installBtn) return;
        if (window.matchMedia('(display-mode: standalone)').matches) {
            installBtn.style.display = 'none';
            return;
        }
        if (visible && deferredPrompt) {
            installBtn.style.display = 'block';
        } else {
            installBtn.style.display = 'none';
        }
    }

    function onReady() {
        document.body.classList.add('no-transition');

        var savedTheme = localStorage.getItem(App.config.THEME_KEY);
        if (savedTheme) {
            App.events.applyTheme(savedTheme);
        } else {
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            App.events.applyTheme(prefersDark ? 'dark' : 'light');
        }

        setTimeout(function() {
            document.body.classList.remove('no-transition');
        }, 50);

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (!localStorage.getItem(App.config.THEME_KEY)) {
                App.events.applyTheme(e.matches ? 'dark' : 'light');
            }
        });

        App.supabase = supabase.createClient(
            'https://qbjlccdqaudyvedpysil.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiamxjY2RxYXVkeXZlZHB5c2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjQ5MDEsImV4cCI6MjA5Mjk0MDkwMX0.dpdlcOQLtc6adA-l2z_ksJ3b6b6pLTQviLrKtxuF-kU'
        );

        if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then(function(isPersisted) {
                console.log('Persistent storage:', isPersisted ? '✅ granted' : '❌ denied');
            });
        }

        App.store.initFromLocalStorage();

        var authPanel = document.getElementById('auth-panel');
        var mobileRow = document.getElementById('mobile-header-row2');
        if (mobileRow) mobileRow.style.display = 'none';
        var syncIndicator = document.getElementById('sync-indicator');
        if (syncIndicator) syncIndicator.style.display = 'none';

        var isDemoMode = false;
        var sidebarLoginBtn = document.getElementById('sidebar-login');
        var drawerLoginBtn = document.getElementById('drawer-login');

        function enterDemoMode() {
            isDemoMode = true;
            App.store.operations = [
                { id: 'demo1', category: 'ДВС', name: 'Масло', intervalKm: 10000, intervalMonths: 12, lastMileage: 0, lastDate: null },
                { id: 'demo2', category: 'Тормозная система', name: 'Тормозные колодки', intervalKm: 30000, lastMileage: 0 }
            ];
            App.store.fuelLog = [
                { date: '2026-05-01', mileage: 1000, liters: 45, pricePerLiter: 50, fuelType: 'Бензин' }
            ];
            App.store.settings.currentMileage = 5000;
            App.store.settings.currentMotohours = 100;
            App.store.saveToLocalStorage();
            document.getElementById('data-panel').style.display = 'block';
            if (typeof App.renderAll === 'function') App.renderAll();
            App.toast('Демо‑режим. Войдите, чтобы сохранить данные.', 'info');
        }

        function initAuthFormEvents(container) {
            var tabLogin = container.querySelector('#tab-login');
            var tabSocial = container.querySelector('#tab-social');
            var authLoginDiv = container.querySelector('#auth-login');
            var authSocialDiv = container.querySelector('#auth-social');
            if (tabLogin) tabLogin.addEventListener('click', function() {
                tabLogin.classList.add('active'); tabSocial.classList.remove('active');
                authLoginDiv.style.display = 'block'; authSocialDiv.style.display = 'none';
            });
            if (tabSocial) tabSocial.addEventListener('click', function() {
                tabSocial.classList.add('active'); tabLogin.classList.remove('active');
                authSocialDiv.style.display = 'block'; authLoginDiv.style.display = 'none';
            });

            var googleBtn = container.querySelector('#supabase-auth-btn');
            if (googleBtn) {
                googleBtn.addEventListener('click', function() {
                    App.supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: window.location.origin }
                    }).catch(function(err) { App.toast('Ошибка входа через Google', 'error'); });
                });
            }

            var loginForm = container.querySelector('#login-form');
            var loginMessage = container.querySelector('#login-message');
            var passwordConfirmLabel = container.querySelector('#password-confirm-label');
            var passwordConfirmInput = container.querySelector('#password-confirm-input');

            if (loginForm) {
                loginForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    var formData = new FormData(loginForm);
                    var username = formData.get('username').trim();
                    var password = formData.get('password');
                    if (!username || !password) {
                        App.toast('Введите логин и пароль', 'error');
                        return;
                    }
                    var email = username + '@vesta.internal';
                    App.supabase.auth.signInWithPassword({ email: email, password: password })
                        .then(function(res) {
                            if (res.error) {
                                loginMessage.textContent = 'Неверный логин или пароль.';
                            } else {
                                var modal = container.closest('.modal');
                                if (modal) {
                                    modal.remove();
                                    document.body.classList.remove('auth-modal-open');
                                }
                            }
                        });
                });

                var signUpBtn = container.querySelector('#login-sign-up-btn');
                if (signUpBtn) {
                    signUpBtn.addEventListener('click', function() {
                        passwordConfirmLabel.style.display = 'block';
                        passwordConfirmInput.style.display = 'block';
                        passwordConfirmInput.required = true;

                        var formData = new FormData(loginForm);
                        var username = formData.get('username').trim();
                        var password = formData.get('password');
                        var passwordConfirm = formData.get('password_confirm');
                        if (!username || !password || !passwordConfirm) {
                            App.toast('Все поля обязательны', 'error');
                            return;
                        }
                        if (password !== passwordConfirm) {
                            App.toast('Пароли не совпадают', 'error');
                            return;
                        }
                        if (password.length < 6) {
                            App.toast('Пароль должен содержать минимум 6 символов', 'error');
                            return;
                        }

                        var email = username + '@vesta.internal';
                        App.supabase.auth.signUp({
                            email: email,
                            password: password,
                            options: { data: { username: username } }
                        }).then(function(res) {
                            if (res.error) {
                                App.toast('Ошибка регистрации: ' + res.error.message, 'error');
                            } else {
                                App.toast('Регистрация успешна! Выполняем вход...', 'success');
                                App.supabase.auth.signInWithPassword({ email: email, password: password })
                                    .then(function(innerRes) {
                                        if (!innerRes.error) {
                                            passwordConfirmLabel.style.display = 'none';
                                            passwordConfirmInput.style.display = 'none';
                                            passwordConfirmInput.required = false;
                                            loginForm.reset();
                                            loginMessage.textContent = '';
                                            container.closest('.modal').remove();
                                            document.body.classList.remove('auth-modal-open');
                                            App.supabase.auth.getUser().then(function(userRes) {
                                                if (userRes.data.user) generateAndShowRecoveryCodes(userRes.data.user.id, username);
                                            });
                                        } else {
                                            App.toast('Регистрация прошла, но вход не удался. Войдите вручную.', 'warning');
                                        }
                                    });
                            }
                        });
                    });
                }
            }
        }

        function openAuthModal() {
            var template = document.getElementById('auth-template');
            if (!template) {
                console.error('Шаблон auth-template не найден');
                return;
            }
            var content = template.content.cloneNode(true);
            var modal = App.ui.createModal('', '');
            var modalContent = modal.querySelector('.modal-content');
            modalContent.innerHTML = '<span class="close">&times;</span>' +
                '<h3 style="margin-top:0; margin-bottom:16px;">Аккаунт</h3>';
            modalContent.appendChild(content);
            document.body.classList.add('auth-modal-open');
            initAuthFormEvents(modalContent);
            var closeBtn = modalContent.querySelector('.close');
            closeBtn.addEventListener('click', function() {
                modal.remove();
                document.body.classList.remove('auth-modal-open');
            });
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                    document.body.classList.remove('auth-modal-open');
                }
            });
            modal.style.display = 'flex';
            App.initIcons();
        }

        if (sidebarLoginBtn) sidebarLoginBtn.addEventListener('click', openAuthModal);
        if (drawerLoginBtn) drawerLoginBtn.addEventListener('click', openAuthModal);

        var savedSession = localStorage.getItem('supabase.auth.token');
        if (!savedSession) {
            enterDemoMode();
        }

        function doLogout() {
            var loginFormEl = document.getElementById('login-form');
            if (loginFormEl) loginFormEl.reset();
            var usernameDisplayEl = document.getElementById('username-display');
            if (usernameDisplayEl) usernameDisplayEl.textContent = '';
            var sidebarUsernameEl = document.getElementById('sidebar-username');
            if (sidebarUsernameEl) sidebarUsernameEl.textContent = '';
            var carContainerEl = document.getElementById('car-selector-container');
            if (carContainerEl) carContainerEl.innerHTML = '';
            App.store.operations = [];
            App.store.fuelLog = [];
            App.store.tireLog = [];
            App.store.parts = [];
            App.store.serviceRecords = [];
            App.store.mileageHistory = [];
            App.store.saveToLocalStorage();
            App.supabase.auth.signOut().catch(function(e) { console.warn('Signout error', e); });
            isLoggedIn = false;
            setInstallButtonVisible(false);
            if (sidebarLoginBtn) sidebarLoginBtn.style.display = '';
            if (drawerLoginBtn) drawerLoginBtn.style.display = '';
            if (typeof App.events.closeDrawer === 'function') App.events.closeDrawer();
            enterDemoMode();
        }

        var logoutSidebarBtn = document.getElementById('sidebar-logout');
        if (logoutSidebarBtn) logoutSidebarBtn.addEventListener('click', doLogout);
        var logoutDrawerBtn = document.getElementById('drawer-logout');
        if (logoutDrawerBtn) logoutDrawerBtn.addEventListener('click', doLogout);

        var isInitialized = false;

        async function handleOnlineSession() {
            if (!navigator.onLine) {
                isLoggedIn = true;
                setInstallButtonVisible(true);
                document.getElementById('data-panel').style.display = 'block';
                var syncIndicatorOffline = document.getElementById('sync-indicator');
                if (syncIndicatorOffline) syncIndicatorOffline.style.display = '';
                var mobileRowOffline = document.getElementById('mobile-header-row2');
                if (mobileRowOffline) mobileRowOffline.style.display = 'flex';

                var cachedUsername = localStorage.getItem('vesta_username') || '';
                var displayElOffline = document.getElementById('username-display');
                if (displayElOffline && cachedUsername) {
                    displayElOffline.textContent = '👤 ' + cachedUsername;
                }
                var sidebarUsernameOffline = document.getElementById('sidebar-username');
                if (sidebarUsernameOffline) sidebarUsernameOffline.textContent = cachedUsername ? '👤 ' + cachedUsername : '';

                App.store.loadCars().then(function() {
                    if (typeof App.ui.pages.renderCarSelector === 'function') {
                        App.ui.pages.renderCarSelector();
                    }
                    if (typeof App.renderAll === 'function') App.renderAll();
                });
                return;
            }

            App.supabase.auth.onAuthStateChange(function(event, session) {
                if (session) {
                    isLoggedIn = true;
                    setInstallButtonVisible(true);
                    isDemoMode = false;
                    if (sidebarLoginBtn) sidebarLoginBtn.style.display = 'none';
                    if (drawerLoginBtn) drawerLoginBtn.style.display = 'none';
                    document.body.classList.remove('auth-modal-open');
                    document.getElementById('data-panel').style.display = 'block';
                    var syncIndicatorOnline = document.getElementById('sync-indicator');
                    if (syncIndicatorOnline) syncIndicatorOnline.style.display = '';
                    var mobileRowOnline = document.getElementById('mobile-header-row2');
                    if (mobileRowOnline) mobileRowOnline.style.display = 'flex';

                    App.supabase.auth.getUser().then(function(userRes) {
                        var displayEl = document.getElementById('username-display');
                        if (displayEl && userRes.data.user && userRes.data.user.user_metadata && userRes.data.user.user_metadata.username) {
                            displayEl.textContent = '👤 ' + userRes.data.user.user_metadata.username;
                            localStorage.setItem('vesta_username', userRes.data.user.user_metadata.username);
                        }
                        var sidebarUsernameEl = document.getElementById('sidebar-username');
                        if (sidebarUsernameEl && userRes.data.user && userRes.data.user.user_metadata && userRes.data.user.user_metadata.username) {
                            sidebarUsernameEl.textContent = '👤 ' + userRes.data.user.user_metadata.username;
                        }
                    });

                    App.store.initFromLocalStorage();

                    if (event === 'PASSWORD_RECOVERY') {
                        var newPassword = prompt('Введите новый пароль (минимум 6 символов):');
                        if (newPassword && newPassword.length >= 6) {
                            App.supabase.auth.updateUser({ password: newPassword }).then(function(res) {
                                if (res.error) App.toast('Ошибка при смене пароля', 'error');
                                else {
                                    App.toast('Пароль успешно изменён!', 'success');
                                    window.location.hash = '';
                                    window.location.search = '';
                                }
                            });
                        }
                    }

                    App.store.loadCars().then(async function() {
                        if (App.store.cars.length === 0) {
                            try {
                                var newCar = await App.supa.createCar('Мой автомобиль');
                                if (newCar.data) {
                                    App.store.cars.push(newCar.data);
                                    App.store.setActiveCar(newCar.data.id);
                                }
                            } catch (e) {
                                console.warn('Не удалось создать автомобиль:', e);
                            }
                        } else if (!App.store.activeCarId) {
                            App.store.setActiveCar(App.store.cars[0].id);
                        }

                        if (typeof App.ui.pages.renderCarSelector === 'function') {
                            App.ui.pages.renderCarSelector();
                        }
                        if (typeof App.ui.pages.checkPendingInvites === 'function') {
                            App.ui.pages.checkPendingInvites();
                        }
                        if (App.store.activeCarId) {
                            if (App.realtime && App.realtime.subscribeToCar) {
                                App.realtime.subscribeToCar(App.store.activeCarId);
                            }
                            App.storage.loadAllData().then(function() {
                                if (typeof App.renderAll === 'function') App.renderAll();
                                if (typeof App.ui.pages.checkAndShowInitialParamsModal === 'function') {
                                    App.ui.pages.checkAndShowInitialParamsModal();
                                }
                            });
                        } else {
                            if (typeof App.renderAll === 'function') App.renderAll();
                        }
                    });
                } else {
                    isLoggedIn = false;
                    setInstallButtonVisible(false);
                    if (sidebarLoginBtn) sidebarLoginBtn.style.display = '';
                    if (drawerLoginBtn) drawerLoginBtn.style.display = '';
                    document.getElementById('data-panel').style.display = 'none';
                    var syncIndicatorOff = document.getElementById('sync-indicator');
                    if (syncIndicatorOff) syncIndicatorOff.style.display = 'none';
                    var mobileRowOff = document.getElementById('mobile-header-row2');
                    if (mobileRowOff) mobileRowOff.style.display = 'none';
                    var carContainerEl = document.getElementById('car-selector-container');
                    if (carContainerEl) carContainerEl.innerHTML = '';
                    var usernameDisplayEl = document.getElementById('username-display');
                    if (usernameDisplayEl) usernameDisplayEl.textContent = '';
                    var sidebarUsernameEl = document.getElementById('sidebar-username');
                    if (sidebarUsernameEl) sidebarUsernameEl.textContent = '';
                    if (App.realtime && App.realtime.unsubscribeAll) {
                        App.realtime.unsubscribeAll();
                    }
                    App.store.operations = [];
                    App.store.fuelLog = [];
                    App.store.tireLog = [];
                    App.store.parts = [];
                    App.store.serviceRecords = [];
                    App.store.mileageHistory = [];
                    App.store.saveToLocalStorage();
                    if (typeof App.renderAll === 'function') App.renderAll();
                }
            });

            App.supabase.auth.getSession().then(function(sessionRes) {
                if (sessionRes.data.session) {
                    isLoggedIn = true;
                    setInstallButtonVisible(true);
                    isDemoMode = false;
                    if (sidebarLoginBtn) sidebarLoginBtn.style.display = 'none';
                    if (drawerLoginBtn) drawerLoginBtn.style.display = 'none';
                    document.body.classList.remove('auth-modal-open');
                    document.getElementById('data-panel').style.display = 'block';
                    var syncIndicatorSess = document.getElementById('sync-indicator');
                    if (syncIndicatorSess) syncIndicatorSess.style.display = '';
                    var mobileRowSess = document.getElementById('mobile-header-row2');
                    if (mobileRowSess) mobileRowSess.style.display = 'flex';

                    var user = sessionRes.data.session.user;
                    if (user) {
                        var displayElSess = document.getElementById('username-display');
                        if (displayElSess && user.user_metadata && user.user_metadata.username) {
                            displayElSess.textContent = '👤 ' + user.user_metadata.username;
                            localStorage.setItem('vesta_username', user.user_metadata.username);
                        }
                        var sidebarUsernameSess = document.getElementById('sidebar-username');
                        if (sidebarUsernameSess && user.user_metadata && user.user_metadata.username) {
                            sidebarUsernameSess.textContent = '👤 ' + user.user_metadata.username;
                        }
                    }

                    App.store.loadCars().then(async function() {
                        if (App.store.cars.length === 0) {
                            try {
                                var newCar = await App.supa.createCar('Мой автомобиль');
                                if (newCar.data) {
                                    App.store.cars.push(newCar.data);
                                    App.store.setActiveCar(newCar.data.id);
                                }
                            } catch (e) {
                                console.warn('Не удалось создать автомобиль:', e);
                            }
                        } else if (!App.store.activeCarId) {
                            App.store.setActiveCar(App.store.cars[0].id);
                        }

                        if (typeof App.ui.pages.renderCarSelector === 'function') {
                            App.ui.pages.renderCarSelector();
                        }
                        if (App.store.activeCarId) {
                            if (App.realtime && App.realtime.subscribeToCar) {
                                App.realtime.subscribeToCar(App.store.activeCarId);
                            }
                            App.storage.loadAllData().then(function() {
                                if (typeof App.renderAll === 'function') App.renderAll();
                                if (typeof App.ui.pages.checkAndShowInitialParamsModal === 'function') {
                                    App.ui.pages.checkAndShowInitialParamsModal();
                                }
                            });
                        } else {
                            if (typeof App.renderAll === 'function') App.renderAll();
                        }
                    });
                }
            });
        }

        window.addEventListener('online', function() {
            if (isInitialized) return;
            isInitialized = true;
            App.toast('Сеть восстановлена', 'success');
            if (App.store.pendingActions.length > 0) {
                App.toast('Синхронизация офлайн-изменений...', 'info');
                App.store.pendingActions.forEach(function(action) {
                    if (action.type === 'service') {
                        App.logic.addServiceRecord(
                            action.opId, action.date, action.mileage, action.motohours,
                            action.partsCost, action.workCost, action.isDIY, action.notes, action.photoUrl
                        );
                    }
                });
                App.store.clearPendingActions();
            }
            handleOnlineSession();
        });

        window.addEventListener('offline', function() {
            App.toast('Вы офлайн', 'warning');
        });

        if (!isInitialized) {
            isInitialized = true;
            handleOnlineSession();
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(new URL('./service-worker.js', location.href)).then(function(registration) {
                console.log('✅ Сервис-воркер зарегистрирован:', registration.scope);
            }).catch(function(err) {
                console.error('❌ Ошибка регистрации сервис-воркера:', err);
            });
        }

        App.events.init();
        App.events.switchToTab('dashboard');

        window.addEventListener('load', function() {
            setTimeout(App.initIcons, 200);
        });

        // ===== ПЛАВАЮЩАЯ FAB-КНОПКА (финальная версия) =====
        (function() {
            var fab = document.createElement('div');
            fab.id = 'fab-menu';
            fab.innerHTML =
                '<div id="fab-overlay" class="fab-overlay" style="display:none;"></div>' +
                '<button id="fab-main-btn" class="fab-main"><i data-lucide="plus"></i></button>' +
                '<div id="fab-actions" class="fab-actions">' +
                    '<button id="fab-mileage" class="fab-action" title="Пробег"><i data-lucide="gauge"></i></button>' +
                    '<button id="fab-fuel" class="fab-action" title="Заправка"><i data-lucide="fuel"></i></button>' +
                    '<button id="fab-service" class="fab-action" title="ТО"><i data-lucide="wrench"></i></button>' +
                    '<button id="fab-part" class="fab-action" title="Запчасть"><i data-lucide="package"></i></button>' +
                '</div>';
            document.body.appendChild(fab);
            App.initIcons();

            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'svg' || node.tagName === 'SVG') {
                                node.removeAttribute('width');
                                node.removeAttribute('height');
                            }
                            node.querySelectorAll && node.querySelectorAll('svg').forEach(function(svg) {
                                svg.removeAttribute('width');
                                svg.removeAttribute('height');
                            });
                        }
                    });
                });
            });
            observer.observe(fab, { childList: true, subtree: true });

            fab.querySelectorAll('svg').forEach(function(svg) {
                svg.removeAttribute('width');
                svg.removeAttribute('height');
            });

            var mainBtn = document.getElementById('fab-main-btn');
            var actions = document.getElementById('fab-actions');
            var overlay = document.getElementById('fab-overlay');
            var actionsOpen = false;

            function setFabIcon(name) {
                var icon = mainBtn.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', name);
                    if (typeof lucide !== 'undefined' && lucide.createIcons) {
                        lucide.createIcons({ elements: [mainBtn] });
                    }
                }
            }

            function openActions() {
                actionsOpen = true;
                overlay.style.display = 'block';
                actions.classList.add('open');
                setFabIcon('x');
            }

            function closeActions() {
                actionsOpen = false;
                overlay.style.display = 'none';
                actions.classList.remove('open');
                setFabIcon('plus');
            }

            mainBtn.addEventListener('click', function() {
                if (actionsOpen) closeActions();
                else openActions();
            });

            overlay.addEventListener('click', closeActions);

            document.getElementById('fab-mileage').addEventListener('click', function() {
                closeActions();
                var currentMileage = App.store.settings.currentMileage || 0;
                var currentMotohours = App.store.settings.currentMotohours || 0;
                var content =
                    '<form id="mileage-form" style="display:flex; flex-direction:column; gap:12px;">' +
                        '<label>Моточасы, ч</label>' +
                        '<input type="number" id="fab-motohours-input" value="' + currentMotohours + '" required>' +
                        '<label>Пробег, км</label>' +
                        '<input type="number" id="fab-mileage-input" value="' + currentMileage + '" required>' +
                        '<div class="modal-actions" style="display:flex; gap:8px; justify-content:flex-end;">' +
                            '<button type="submit" class="primary-btn">Обновить</button>' +
                            '<button type="button" class="cancel-btn secondary-btn">Отмена</button>' +
                        '</div>' +
                    '</form>';
                var modal = App.ui.createModal('Обновить пробег', content);
                var form = modal.querySelector('#mileage-form');
                form.onsubmit = function(e) {
                    e.preventDefault();
                    var newM = parseFloat(document.getElementById('fab-mileage-input').value);
                    var newH = parseFloat(document.getElementById('fab-motohours-input').value);
                    if (isNaN(newM) || isNaN(newH)) {
                        App.toast('Введите числа', 'error');
                        return;
                    }
                    var dashM = document.getElementById('dash-new-mileage');
                    var dashH = document.getElementById('dash-new-motohours');
                    if (dashM) dashM.value = newM;
                    if (dashH) dashH.value = newH;
                    App.events.updateMileageAndAverages();
                    modal.remove();
                    App.toast('Пробег и моточасы обновлены', 'success');
                };
                modal.querySelector('.cancel-btn').onclick = function() { modal.remove(); };
            });

            document.getElementById('fab-fuel').addEventListener('click', function() {
                closeActions();
                if (typeof App.ui.pages.openFuelModal === 'function') App.ui.pages.openFuelModal(null);
            });
            document.getElementById('fab-service').addEventListener('click', function() {
                closeActions();
                if (typeof App.ui.pages.openOperationForm === 'function') App.ui.pages.openOperationForm(null);
            });
            document.getElementById('fab-part').addEventListener('click', function() {
                closeActions();
                if (typeof App.ui.pages.openPartForm === 'function') App.ui.pages.openPartForm(null);
            });
        })();
    }

    async function recoverViaTelegram(msgEl) { /* ... без изменений ... */ }
    async function recoverViaRecoveryCode(msgEl) { /* ... без изменений ... */ }
    async function generateAndShowRecoveryCodes(userId, username) { /* ... без изменений ... */ }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})();