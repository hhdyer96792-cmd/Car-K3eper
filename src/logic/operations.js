// src/logic/operations.js
window.App = window.App || {};
App.logic = App.logic || {};

App.logic.addServiceRecord = function(opId, date, mileage, motohours, partsCost, workCost, isDIY, notes, photoUrl) {
    var op = App.store.operations.find(function(o) { return o.id == opId; });
    if (!op) return Promise.reject('Операция не найдена');

    op.lastDate = date;
    op.lastMileage = +mileage;
    op.lastMotohours = +motohours;

    if (App.config.USE_SUPABASE) {
        return App.storage.saveOperation(op).then(function() {
            return App.storage.addHistoryRecord({
                uuid: crypto.randomUUID(),
                operation_id: op.id,
                date: date,
                mileage: mileage,
                motohours: motohours,
                parts_cost: partsCost || 0,
                work_cost: workCost || 0,
                is_diy: isDIY,
                notes: notes,
                photo_url: photoUrl
            });
        }).then(function() {
            if (workCost) {
                return App.supa.insertRow('work_costs', {
                    operation_id: op.id,
                    cost: workCost,
                    is_diy: isDIY,
                    notes: notes
                });
            }
        }).then(function() {
            App.storage.loadAllData();
        });
    } else {
        // Старая логика (не используется)
        if (App.auth.accessToken) {
            return App.storage.saveOperation(op).then(function() {
                return App.storage.addHistoryRecord({
                    uuid: crypto.randomUUID(),
                    operation_id: opId,
                    date: date,
                    mileage: mileage,
                    motohours: motohours,
                    parts_cost: partsCost || 0,
                    work_cost: workCost || 0,
                    is_diy: isDIY,
                    notes: notes,
                    photo_url: photoUrl
                });
            }).then(function() {
                if (workCost) {
                    return App.storage.addWorkCost({
                        uuid: crypto.randomUUID(),
                        operationId: opId,
                        cost: workCost,
                        isDIY: isDIY,
                        notes: notes
                    });
                }
            }).then(function() {
                App.loadSheet();
            });
        } else {
            App.store.serviceRecords.unshift({
                uuid: crypto.randomUUID(),
                operation_id: opId,
                date: date,
                mileage: mileage,
                motohours: motohours,
                parts_cost: partsCost || 0,
                work_cost: workCost || 0,
                is_diy: isDIY,
                notes: notes,
                photo_url: photoUrl,
                timestamp: new Date().toISOString()
            });
            App.store.saveToLocalStorage();
            App.toast('Запись сохранена локально', 'warning');
            return Promise.resolve();
        }
    }
};

App.logic.saveOperation = function(data) {
    var category = data.category;
    var name = data.name;
    var km = data.km || '';
    var months = data.months || '';
    var moto = data.moto || '';
    var id = data.id;

    var existing = id ? App.store.operations.find(function(o) { return o.id == id; }) : null;

    var opData = {
        category: category,
        name: name,
        intervalKm: parseInt(km) || 0,
        intervalMonths: parseInt(months) || 0,
        intervalMotohours: moto ? parseInt(moto) : null,
        lastDate: existing ? existing.lastDate : null,
        lastMileage: existing ? existing.lastMileage : 0,
        lastMotohours: existing ? existing.lastMotohours : 0
    };

    function updateLocalStore(assignedId) {
        if (existing) {
            Object.assign(existing, opData);
        } else {
            var newOp = Object.assign({}, opData, { id: assignedId, uuid: assignedId });
            App.store.operations.push(newOp);
        }
        App.store.saveToLocalStorage();
        App.ui.pages.renderTOTable();
        App.toast(id ? 'Операция обновлена' : 'Операция добавлена', 'success');
    }

    if (App.config.USE_SUPABASE) {
        if (existing) {
            opData.id = existing.id;
            opData.uuid = existing.uuid;
            return App.supa.saveOperation(opData)
                .then(function() { updateLocalStore(existing.id); })
                .catch(function(err) { console.error(err); App.toast('Ошибка сохранения операции', 'error'); });
        } else {
            return App.supa.saveOperation(opData)
                .then(function(res) {
                    var newId = res && res.data && res.data.length > 0 ? res.data[0].id : null;
                    updateLocalStore(newId);
                })
                .catch(function(err) { console.error(err); App.toast('Ошибка сохранения операции', 'error'); });
        }
    }
};

App.logic.addDependentOperations = function(mainOpName, opId, date, mileage, motohours, notesPrefix) {
    var pairs = App.config.AUTO_DEDUCT_PAIRS.filter(function(p) {
        return p.main.toLowerCase() === mainOpName.toLowerCase();
    });
    pairs.forEach(function(pair) {
        var dependentOp = App.store.operations.find(function(op) {
            return op.name.toLowerCase() === pair.dependent.toLowerCase();
        });
        if (dependentOp) {
            var alreadyExists = App.store.serviceRecords.some(function(rec) {
                return rec.operation_id == dependentOp.id && rec.date === date;
            });
            if (!alreadyExists) {
                App.logic.addServiceRecord(
                    dependentOp.id, date, mileage, motohours,
                    0, 0, false,
                    pair.note || notesPrefix,
                    ''
                );
            }
        }
    });
};
