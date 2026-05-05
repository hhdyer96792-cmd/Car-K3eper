// src/ui/pages/settings.js
window.App = window.App || {};
App.ui = App.ui || {};
App.ui.pages = App.ui.pages || {};

App.ui.pages.saveSettings = function() {
    var telegramTokenInput = document.getElementById('telegram-token');
    var telegramChatIdInput = document.getElementById('telegram-chatid');
    var notificationMethodSelect = document.getElementById('notification-method');
    var reminderDays1 = document.getElementById('reminder-days-1')?.value || 7;
    var reminderDays2 = document.getElementById('reminder-days-2')?.value || 2;

    var baseMileageInput = document.getElementById('set-base-mileage');
    var baseMotohoursInput = document.getElementById('set-base-motohours');
    var purchaseDateInput = document.getElementById('purchase-date');

    // Обновляем store
    if (baseMileageInput) App.store.baseMileage = +baseMileageInput.value || 0;
    if (baseMotohoursInput) App.store.baseMotohours = +baseMotohoursInput.value || 0;
    if (purchaseDateInput) App.store.purchaseDate = purchaseDateInput.value;

    App.store.calculateOwnershipDays();

    var settings = {
        currentMileage: App.store.settings.currentMileage,
        currentMotohours: App.store.settings.currentMotohours,
        avgDailyMileage: App.store.settings.avgDailyMileage,
        avgDailyMotohours: App.store.settings.avgDailyMotohours,
        telegramToken: telegramTokenInput?.value || '',
        telegramChatId: telegramChatIdInput?.value || '',
        notificationMethod: notificationMethodSelect?.value || 'telegram',
        reminderDays: reminderDays1 + ',' + reminderDays2
    };

    // Сохраняем
    App.storage.saveSettings(settings).then(function() {
        if (telegramTokenInput) App.store.settings.telegramToken = telegramTokenInput.value;
        if (telegramChatIdInput) App.store.settings.telegramChatId = telegramChatIdInput.value;
        if (notificationMethodSelect) {
            App.store.settings.notificationMethod = notificationMethodSelect.value;
            localStorage.setItem(App.config.NOTIFICATION_METHOD_KEY, notificationMethodSelect.value);
        }
        App.store.settings.currentMileage = settings.currentMileage;
        App.store.settings.currentMotohours = settings.currentMotohours;
        App.store.settings.reminderDays = settings.reminderDays;
        App.store.saveToLocalStorage();

        document.getElementById('settings-result').textContent = '✅ Сохранено';
        App.toast('Настройки сохранены', 'success');
    }).catch(function(err) {
        console.error(err);
        document.getElementById('settings-result').textContent = '⚠️ Ошибка сохранения';
        App.toast('Ошибка сохранения настроек', 'error');
    });
};

App.ui.pages.populateSettingsFields = function() {
    var telegramTokenInput = document.getElementById('telegram-token');
    var telegramChatIdInput = document.getElementById('telegram-chatid');
    var notificationMethodSelect = document.getElementById('notification-method');

    if (telegramTokenInput) telegramTokenInput.value = App.store.settings.telegramToken || '';
    if (telegramChatIdInput) telegramChatIdInput.value = App.store.settings.telegramChatId || '';
    if (notificationMethodSelect) notificationMethodSelect.value = App.store.settings.notificationMethod || 'telegram';

    if (App.store.settings.reminderDays) {
        var parts = App.store.settings.reminderDays.split(',');
        if (document.getElementById('reminder-days-1')) document.getElementById('reminder-days-1').value = parts[0] || 7;
        if (document.getElementById('reminder-days-2')) document.getElementById('reminder-days-2').value = parts[1] || 2;
    }

    var baseMileageInput = document.getElementById('set-base-mileage');
    var baseMotohoursInput = document.getElementById('set-base-motohours');
    var purchaseDateInput = document.getElementById('purchase-date');
    var ownershipDaysInput = document.getElementById('ownership-days');

    if (baseMileageInput) baseMileageInput.value = App.store.settings.currentMileage;
    if (baseMotohoursInput) baseMotohoursInput.value = App.store.settings.currentMotohours;
    if (purchaseDateInput) purchaseDateInput.value = App.store.purchaseDate;
    if (ownershipDaysInput) ownershipDaysInput.value = App.store.ownershipDays;

    App.ui.pages.updateOwnershipDisplay();
    App.ui.pages.renderSharingList();
};

// ... (остальные функции без изменений)