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
        if (authPanel) authPanel.style.display = 'block';

        var mobileRow = document.getElementById('mobile-header-row2');
        if (mobileRow) mobileRow.style.display = 'none';
        var syncIndicator = document.getElementById('sync-indicator');
        if (syncIndicator) syncIndicator.style.display = 'none';

        var tabLogin = document.getElementById('tab-login');
        var tabSocial = document.getElementById('tab-social');
        var authLoginDiv = document.getElementById('auth-login');
        var authSocialDiv = document.getElementById('auth-social');

        function switchAuthTab(tab) {
            if (tab === 'login') {
                tabLogin.classList.add('active'); tabSocial.classList.remove('active');
                authLoginDiv.style.display = 'block'; authSocialDiv.style.display = 'none';
            } else {
                tabSocial.classList.add('active'); tabLogin.classList.remove('active');
                authSocialDiv.style.display = 'block'; authLoginDiv.style.display = 'none';
            }
        }
        if (tabLogin) tabLogin.addEventListener('click', function() { switchAuthTab('login'); });
        if (tabSocial) tabSocial.addEventListener('click', function() { switchAuthTab('social'); });

        // Google
        var googleBtn = document.getElementById('supabase-auth-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', function() {
                App.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin }
                }).catch(function(err) { App.toast('Ошибка входа через Google', 'error'); });
            });
        }

        // Apple
        var appleBtn = document.getElementById('apple-auth-btn');
        if (appleBtn) {
            appleBtn.addEventListener('click', function() {
                App.supabase.auth.signInWithOAuth({
                    provider: 'apple',
                    options: { redirectTo: window.location.origin }
                }).catch(function(err) { App.toast('Ошибка входа через Apple', 'error'); });
            });
        }

        // Логин + пароль
        var loginForm = document.getElementById('login-form');
        var loginMessage = document.getElementById('login-message');
        var passwordConfirmLabel = document.getElementById('password-confirm-label');
        var passwordConfirmInput = document.getElementById('password-confirm-input');

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
                        if (res.error) loginMessage.textContent = 'Неверный логин или пароль.';
                    });
            });

            var signUpBtn = document.getElementById('login-sign-up-btn');
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

        // Восстановление доступа
        var forgotLink = document.getElementById('forgot-access-link');
        var recoveryBlock = document.getElementById('recovery-options');
        var recoveryMsg = document.getElementById('recovery-message');
        if (forgotLink) {
            forgotLink.addEventListener('click', function(e) {
                e.preventDefault();
                recoveryBlock.style.display = 'block';
            });
        }

        var btnTelegram = document.getElementById('recover-telegram');
        if (btnTelegram) btnTelegram.addEventListener('click', function() { recoverViaTelegram(recoveryMsg); });

        var btnCode = document.getElementById('recover-code');
        if (btnCode) btnCode.addEventListener('click', function() { recoverViaRecoveryCode(recoveryMsg); });

        var btnRecoverGoogle = document.getElementById('recover-google');
        if (btnRecoverGoogle) {
            btnRecoverGoogle.addEventListener('click', function() {
                App.supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin }
                });
            });
        }

        // PWA install
        var installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.style.display = 'none';
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setInstallButtonVisible(false);
        }

        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            setInstallButtonVisible(isLoggedIn);
        });
        window.addEventListener('appinstalled', function() {
            console.log('App installed');
            deferredPrompt = null;
            setInstallButtonVisible(false);
        });

        setTimeout(function() {
            if (!deferredPrompt && installBtn && isLoggedIn) {
                installBtn.style.display = 'block';
                installBtn.addEventListener('click', function() {
                    alert('Чтобы установить приложение, откройте меню браузера и выберите "Добавить на главный экран" (или "Установить").');
                });
            }
        }, 3000);

        // Firebase Cloud Messaging
        var messaging;
        try {
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
                firebase.initializeApp({
                    apiKey: "AIzaSyCKz1GKDdqxtK6NyLQAZ84QqUUCaqTQDWQ",
                    authDomain: "car-k3eeper.firebaseapp.com",
                    projectId: "car-k3eeper",
                    storageBucket: "car-k3eeper.firebasestorage.app",
                    messagingSenderId: "826833638199",
                    appId: "1:826833638199:web:647fedbe3eae5b605240b2"
                });
            }
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                messaging = firebase.messaging();

                function saveTokenWithRetry(attempt) {
                    attempt = attempt || 1;
                    navigator.serviceWorker.ready.then(function(registration) {
                        messaging.getToken({
                            vapidKey: 'BEUVrsWau5E4NvAwwAKmkjfK8yoDVntppWmZ2IdqseLVxuNNy47bV7eOLVYDmZ1b2P3F27eRqJLoAjW58Fh0tyY',
                            serviceWorkerRegistration: registration
                        }).then(function(currentToken) {
                            if (!currentToken) return;
                            console.log('FCM token:', currentToken);
                            App.supabase.auth.getUser().then(function(userRes) {
                                if (!userRes.data.user) return;
                                App.supabase.from('push_subscriptions').upsert({
                                    user_id: userRes.data.user.id,
                                    player_id: currentToken,
                                    updated_at: new Date().toISOString()
                                }, { onConflict: 'user_id' }).then(function() {
                                    console.log('FCM token saved');
                                    updatePushUI(true);
                                });
                            }).catch(function(err) {
                                console.warn('getUser error, retrying in 1s', err);
                                if (attempt < 3) {
                                    setTimeout(function() { saveTokenWithRetry(attempt + 1); }, 1000);
                                }
                            });
                        }).catch(console.error);
                    });
                }

                window.requestPushPermission = function() {
                    Notification.requestPermission().then(function(permission) {
                        if (permission === 'granted') {
                            saveTokenWithRetry();
                        }
                    });
                };
                var subscribePushBtn = document.getElementById('subscribe-push-btn');
                if (subscribePushBtn) {
                    subscribePushBtn.addEventListener('click', function() {
                        if (typeof window.requestPushPermission === 'function') {
                            window.requestPushPermission();
                        }
                    });
                }
            }
        } catch (e) {
            console.warn('Firebase init skipped:', e);
        }

        var unsubscribePushBtn = document.getElementById('unsubscribe-push-btn');
        if (unsubscribePushBtn) {
            unsubscribePushBtn.addEventListener('click', async function() {
                try {
                    if (messaging) {
                        await messaging.deleteToken();
                    }
                } catch(e) {
                    console.warn('Token delete failed:', e);
                }
                var userRes = await App.supabase.auth.getUser();
                if (userRes.data.user) {
                    await App.supabase.from('push_subscriptions').delete().eq('user_id', userRes.data.user.id);
                }
                updatePushUI(false);
                App.toast('Подписка на push отключена', 'success');
            });
        }

        function updatePushUI(isActive) {
            var pushStatus = document.getElementById('push-status');
            var subBtn = document.getElementById('subscribe-push-btn');
            var unsubBtn = document.getElementById('unsubscribe-push-btn');
            if (pushStatus) pushStatus.textContent = isActive ? '✅ Push активны' : 'Push-уведомления не настроены';
            if (subBtn) subBtn.style.display = isActive ? 'none' : 'inline-block';
            if (unsubBtn) unsubBtn.style.display = isActive ? 'inline-block' : 'none';
        }

        // Кнопка «Выйти»
        function doLogout() {
            var loginFormEl = document.getElementById('login-form');
            if (loginFormEl) loginFormEl.reset();
            var usernameDisplayEl = document.getElementById('username-display');
            if (usernameDisplayEl) usernameDisplayEl.textContent = '';
            var sidebarUsernameEl = document.getElementById('sidebar-username');
            if (sidebarUsernameEl) sidebarUsernameEl.textContent = '';
            var carContainerEl = document.getElementById('car-selector-container');
            if (carContainerEl) carContainerEl.innerHTML = '';
            var authPanelEl = document.getElementById('auth-panel');
            if (authPanelEl) authPanelEl.style.display = 'block';
            var dataPanelEl = document.getElementById('data-panel');
            if (dataPanelEl) dataPanelEl.style.display = 'none';
            var mobileRowEl = document.getElementById('mobile-header-row2');
            if (mobileRowEl) mobileRowEl.style.display = 'none';
            var syncIndicatorEl = document.getElementById('sync-indicator');
            if (syncIndicatorEl) syncIndicatorEl.style.display = 'none';
            App.supabase.auth.signOut().catch(function(e) { console.warn('Signout error', e); });
            isLoggedIn = false;
            setInstallButtonVisible(false);
        }
        var logoutSidebarBtn = document.getElementById('sidebar-logout');
        if (logoutSidebarBtn) logoutSidebarBtn.addEventListener('click', doLogout);
        var logoutDrawerBtn = document.getElementById('drawer-logout');
        if (logoutDrawerBtn) logoutDrawerBtn.addEventListener('click', doLogout);

        // ======================= СЕССИЯ (с Realtime) =======================
        var isInitialized = false;

        async function handleOnlineSession() {
            if (!navigator.onLine) {
                isLoggedIn = true;
                setInstallButtonVisible(true);
                if (authPanel) authPanel.style.display = 'none';
                var dp = document.getElementById('data-panel');
                if (dp) dp.style.display = 'block';
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
                    App.ui.pages.renderCarSelector();
                    if (typeof App.renderAll === 'function') App.renderAll();
                });
                return;
            }

            App.supabase.auth.onAuthStateChange(function(event, session) {
                if (session) {
                    isLoggedIn = true;
                    setInstallButtonVisible(true);
                    if (authPanel) authPanel.style.display = 'none';
                    var dp = document.getElementById('data-panel');
                    if (dp) dp.style.display = 'block';
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

                    App.supabase.auth.getUser().then(function(userRes) {
                        if (!userRes.data.user) return;
                        App.supabase.from('push_subscriptions').select('player_id').eq('user_id', userRes.data.user.id).limit(1).then(function(subRes) {
                            if (subRes.error) { console.warn('Ошибка проверки подписки:', subRes.error); return; }
                            updatePushUI(!!(subRes.data && subRes.data.length > 0));
                        });
                    });

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

                        App.ui.pages.renderCarSelector();
                        App.ui.pages.checkPendingInvites();
                        if (App.store.activeCarId) {
                            if (App.realtime && App.realtime.subscribeToCar) {
                                App.realtime.subscribeToCar(App.store.activeCarId);
                            }
                            App.storage.loadAllData().then(function() {
                                if (typeof App.renderAll === 'function') App.renderAll();
                                var redirect = sessionStorage.redirect;
                                if (redirect) {
                                    sessionStorage.removeItem('redirect');
                                    var url = new URL(redirect);
                                    var inviteCode = url.searchParams.get('invite');
                                    if (inviteCode) {
                                        App.ui.pages.checkPendingInvites();
                                    }
                                }
                                App.ui.pages.checkAndShowInitialParamsModal();
                            });
                        } else {
                            if (typeof App.renderAll === 'function') App.renderAll();
                        }
                    });
                } else {
                    isLoggedIn = false;
                    setInstallButtonVisible(false);
                    if (authPanel) authPanel.style.display = 'block';
                    var dp = document.getElementById('data-panel');
                    if (dp) dp.style.display = 'none';
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
                    if (authPanel) authPanel.style.display = 'none';
                    var dp = document.getElementById('data-panel');
                    if (dp) dp.style.display = 'block';
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

                    if (user) {
                        App.supabase.from('push_subscriptions').select('player_id').eq('user_id', user.id).limit(1).then(function(subRes) {
                            if (subRes.error) { console.warn('Ошибка проверки подписки:', subRes.error); return; }
                            updatePushUI(!!(subRes.data && subRes.data.length > 0));
                        });
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

                        App.ui.pages.renderCarSelector();
                        if (App.store.activeCarId) {
                            if (App.realtime && App.realtime.subscribeToCar) {
                                App.realtime.subscribeToCar(App.store.activeCarId);
                            }
                            App.storage.loadAllData().then(function() {
                                if (typeof App.renderAll === 'function') App.renderAll();
                                var redirect = sessionStorage.redirect;
                                if (redirect) {
                                    sessionStorage.removeItem('redirect');
                                    var url = new URL(redirect);
                                    var inviteCode = url.searchParams.get('invite');
                                    if (inviteCode) {
                                        App.ui.pages.checkPendingInvites();
                                    }
                                }
                                App.ui.pages.checkAndShowInitialParamsModal();
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

        // Регистрация сервис-воркера
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
    }

    // Функции восстановления
    async function recoverViaTelegram(msgEl) {
        var username = prompt('Введите ваш логин:');
        if (!username) return;

        var res = await App.supabase.rpc('get_user_by_username', { p_username: username });
        if (res.error || !res.data || res.data.length === 0) { msgEl.textContent = 'Пользователь не найден'; return; }
        var userData = res.data[0];

        var setRes = await App.supabase.rpc('get_telegram_settings', { p_user_id: userData.id });
        if (setRes.error || !setRes.data || !setRes.data.telegram_chat_id || !setRes.data.telegram_token) {
            msgEl.textContent = 'Telegram не привязан. Используйте другой способ.'; return;
        }

        var code = Math.floor(100000 + Math.random() * 900000).toString();
        await App.supabase.from('recovery_codes').insert({ user_id: userData.id, code_hash: code });
        await fetch(`https://api.telegram.org/bot${setRes.data.telegram_token}/sendMessage`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ chat_id: setRes.data.telegram_chat_id, text: `Код для сброса пароля: ${code}` })
        });

        var input = prompt('Код отправлен в Telegram. Введите его:');
        if (!input) return;

        var tokenRes = await App.supabase.rpc('consume_recovery_code', { p_user_id: userData.id, p_code: input });
        if (tokenRes.error || !tokenRes.data) { msgEl.textContent = 'Неверный код или срок истёк'; return; }

        var newPassword = prompt('Введите новый пароль (минимум 6 символов):');
        if (!newPassword || newPassword.length < 6) {
            msgEl.textContent = 'Пароль должен содержать не менее 6 символов';
            return;
        }

        var fetchRes = await fetch('https://qbjlccdqaudyvedpysil.supabase.co/functions/v1/secure-reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset_token: tokenRes.data, newPassword: newPassword })
        });

        if (fetchRes.ok) {
            msgEl.textContent = 'Пароль успешно изменён! Теперь войдите с новым паролем.';
        } else {
            var errText = await fetchRes.text();
            msgEl.textContent = 'Ошибка при сбросе: ' + errText;
        }
    }

    async function recoverViaRecoveryCode(msgEl) {
        var username = prompt('Введите ваш логин:');
        if (!username) return;

        var res = await App.supabase.rpc('get_user_by_username', { p_username: username });
        if (res.error || !res.data || res.data.length === 0) { msgEl.textContent = 'Пользователь не найден'; return; }
        var userData = res.data[0];

        var code = prompt('Введите резервный код:');
        if (!code) return;

        var tokenRes = await App.supabase.rpc('consume_recovery_code', { p_user_id: userData.id, p_code: code });
        if (tokenRes.error || !tokenRes.data) { msgEl.textContent = 'Неверный код или срок истёк'; return; }

        var newPassword = prompt('Введите новый пароль (минимум 6 символов):');
        if (!newPassword || newPassword.length < 6) {
            msgEl.textContent = 'Пароль должен содержать не менее 6 символов';
            return;
        }

        var fetchRes = await fetch('https://qbjlccdqaudyvedpysil.supabase.co/functions/v1/secure-reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset_token: tokenRes.data, newPassword: newPassword })
        });

        if (fetchRes.ok) {
            msgEl.textContent = 'Пароль успешно изменён! Теперь войдите с новым паролем.';
        } else {
            var errText = await fetchRes.text();
            msgEl.textContent = 'Ошибка при сбросе: ' + errText;
        }
    }

    async function generateAndShowRecoveryCodes(userId, username) {
        var codes = [];
        for (var i = 0; i < 8; i++) {
            var code = Array.from({length: 8}, function() { return Math.floor(Math.random() * 10); }).join('');
            codes.push(code);
            await App.supabase.from('recovery_codes').insert({ user_id: userId, code_hash: code });
        }
        var msg = 'Ваши резервные коды для восстановления доступа (сохраните их!):\n\n' + codes.join('\n');
        alert(msg);
    }

// ===== ПЛАВАЮЩАЯ FAB-КНОПКА (Speed Dial, исправленная) =====
(function() {
    var fab = document.createElement('div');
    fab.id = 'fab-menu';
    fab.innerHTML =
        '<div id="fab-overlay" class="fab-overlay" style="display:none;"></div>' +
        '<button id="fab-main-btn" class="fab-main"><i data-lucide="plus"></i></button>' +
        '<div id="fab-actions" class="fab-actions">' +
            '<button id="fab-fuel" class="fab-action" title="Заправка"><i data-lucide="fuel"></i></button>' +
            '<button id="fab-service" class="fab-action" title="ТО"><i data-lucide="wrench"></i></button>' +
            '<button id="fab-part" class="fab-action" title="Запчасть"><i data-lucide="package"></i></button>' +
        '</div>';
    document.body.appendChild(fab);
    App.initIcons();

    var mainBtn = document.getElementById('fab-main-btn');
    var actions = document.getElementById('fab-actions');
    var overlay = document.getElementById('fab-overlay');
    var actionsOpen = false;
    var isDragging = false, startX, startY, startLeft, startTop, dragThreshold = 5, moved = false;

    // --- Быстрое перетаскивание с requestAnimationFrame ---
    mainBtn.addEventListener('pointerdown', function(e) {
    if (window.innerWidth > 768) return;   // на десктопе не перетаскиваем  
    if (actionsOpen) return;   // ← не перетаскиваем, если меню раскрыто
    if (e.target.closest('#fab-actions')) return;
        isDragging = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
        var rect = fab.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        fab.style.transition = 'none';
        mainBtn.setPointerCapture(e.pointerId);
    });

    window.addEventListener('pointermove', function(e) {
    if (!isDragging) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) return;
    moved = true;
    // Сразу обновляем позицию, без rAF
    var newLeft = Math.min(window.innerWidth - 64, Math.max(0, startLeft + dx));
    var newTop = Math.min(window.innerHeight - 64, Math.max(0, startTop + dy));
    fab.style.left = newLeft + 'px';
    fab.style.top = newTop + 'px';
});
    });

    window.addEventListener('pointerup', function() {
        if (!isDragging) return;
        isDragging = false;
        fab.style.transition = 'left 0.2s, top 0.2s';
        if (moved) {
            localStorage.setItem('fab_position', JSON.stringify({ left: fab.style.left, top: fab.style.top }));
        }
    });

    // Восстановление позиции
    var saved = localStorage.getItem('fab_position');
    if (saved) {
        try {
            var pos = JSON.parse(saved);
            if (pos.left) fab.style.left = pos.left;
            if (pos.top) fab.style.top = pos.top;
        } catch(e) {}
    }

    // --- Переключение иконки (безопасно) ---
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

    // Обработчик клика: не открываем после перетаскивания
    mainBtn.addEventListener('click', function() {
        if (moved) { moved = false; return; }
        if (actionsOpen) closeActions();
        else openActions();
    });

    overlay.addEventListener('click', closeActions);

    // Кнопки действий
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})();
