// NotificationService - Voor gebruikersfeedback
class NotificationService {
    constructor() { console.log('NotificationService geinitialiseerd'); }
    success(msg) { console.log('SUCCESS:', msg); }
    error(msg) { console.log('ERROR:', msg); }
    info(msg) { console.log('INFO:', msg); }
}

// Globale instance
const notificationService = new NotificationService();

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('App geladen!');
    notificationService.success('Applicatie succesvol geladen!');
});
