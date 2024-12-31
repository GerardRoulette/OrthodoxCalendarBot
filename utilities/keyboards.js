const { InlineKeyboard } = require('./bot.js');

const menuKeyboard = new InlineKeyboard()
    .text('Установить часовой пояс', 'choose-timezone')
    .row()
    .text('Установить желаемое время', 'choose-preferred-time')
    .row()
    .text('Как использовать бот в групповом чате?', 'groupchat')
    .row()
    .text('Информация о разработчике');

    const menuKeyboardGroup = new InlineKeyboard()
    .text('Установить часовой пояс', 'choose-timezone')
    .row()
    .text('Установить желаемое время', 'choose-preferred-time')

const timeZoneKeyboardOne = new InlineKeyboard()
    .text('UTC +0 (Британия, Западная Африка)', '0').row()
    .text('UTC +1 (Европа, Центральная Африка)', '1').row()
    .text('UTC +2 (Калининград, Восточная Европа)', '2').row()
    .text('UTC +3 (Москва, Санкт-Петербург)', '3').row()
    .text('UTC +3:30 (Иран)', '3.5').row()
    .text('UTC +4 (Самара, Саратов, Ижевск, Грузия, ОАЭ)', '4').row()
    .text('UTC +4:30 (Афганистан)', '4.5').row()
    .text('UTC +5 (Башкирия, Челябинск, Пермь, Оренбург)', '5').row()
    .text('UTC +5:30 (Индия, Шри-Ланка)', '5.5').row()
    .text('UTC +5:45 (Непал)', '5.75').row()
    .text('❌ ОБРАТНО В МЕНЮ', 'mainmenu').text('ВПЕРЕД ➡️➡️➡️', 'pagetwo')

const timeZoneKeyboardTwo = new InlineKeyboard()
    .text('UTC +6 (Омск, Кыргызстан)', '6').row()
    .text('UTC +6:30 (Мьянма)', '6.5').row()
    .text('UTC +7 (Красноярск, Кемерово, Томск, Алтай)', '7').row()
    .text('UTC +8 (Бурятия, Иркутск, Китай)', '8').row()
    .text('UTC +9 (Якутск, Благовещенск, Япония, Корея)', '9').row()
    .text('UTC +10 (Хабаровск, Владивосток, Папуа)', '10').row()
    .text('UTC +11 (Магадан, Сахалин)', '11').row()
    .text('UTC +12 (Чукотка, Камчатка, Новая Зеландия)', '12').row()
    .text('UTC +13 (Самоа, Тонга, Токелау)', '13').row()
    .text('UTC -11 (Американское Самоа, Мидуэй)', '-11').row()
    .text('⬅️⬅️⬅️ НАЗАД', 'pageone').text('ВПЕРЕД ➡️➡️➡️', 'pagethree')



const timeZoneKeyboardThree = new InlineKeyboard()
    .text('UTC -10 (Гавайи)', '-10').row()
    .text('UTC -9 (Аляска)', '-9').row()
    .text('UTC -8 (Калифорния, Невада, Орегон)', '-8').row()
    .text('UTC -7 (Аризона, Колорадо, Юта)', '-7').row()
    .text('UTC -6 (Калифорния, Невада, Орегон)', '-6').row()
    .text('UTC -5 (Нью-Йорк, Куба, Панама, Перу)', '-5').row()
    .text('UTC -4 (Венесуэла, Карибские острова)', '-4').row()
    .text('UTC -3 (Аргентина, Бразилия, Уругвай)', '-3').row()
    .text('UTC -2 (Гренландия)', '-2').row()
    .text('UTC -1 (Кабо-Верде, Азорские острова)', '-1').row()
    .text('⬅️⬅️⬅️ НАЗАД', 'pagetwo');

const backKeyboard = new InlineKeyboard()
    .text('Назад в главное меню', 'mainmenu').row()

const timeZoneMap = {
        '0': 'UTC +0 (Британия, Западная Африка)',
        '1': 'UTC +1 (Европа, Центральная Африка)',
        '2': 'UTC +2 (Калининград, Восточная Европа)',
        '3': 'UTC +3 (Москва, Санкт-Петербург)',
        '3.5': 'UTC +3:30 (Иран)',
        '4': 'UTC +4 (Самара, Саратов, Ижевск, Грузия, ОАЭ)',
        '4.5': 'UTC +4:30 (Афганистан)',
        '5': 'UTC +5 (Башкирия, Челябинск, Пермь, Оренбург)',
        '5.5': 'UTC +5:30 (Индия, Шри-Ланка)',
        '5.75': 'UTC +5:45 (Непал)',
        '6': 'UTC +6 (Омск, Кыргызстан)',
        '6.5': 'UTC +6:30 (Мьянма)',
        '7': 'UTC +7 (Красноярск, Кемерово, Томск, Алтай)',
        '8': 'UTC +8 (Бурятия, Иркутск, Китай)',
        '9': 'UTC +9 (Якутск, Благовещенск, Япония, Корея)',
        '10': 'UTC +10 (Хабаровск, Владивосток, Папуа)',
        '11': 'UTC +11 (Магадан, Сахалин)',
        '12': 'UTC +12 (Чукотка, Камчатка, Новая Зеландия)',
        '13': 'UTC +13 (Самоа, Тонга, Токелау)',
        '-11': 'UTC -11 (Американское Самоа, Мидуэй)',
        '-10': 'UTC -10 (Гавайи)',
        '-9': 'UTC -9 (Аляска)',
        '-8': 'UTC -8 (Калифорния, Невада, Орегон)',
        '-7': 'UTC -7 (Аризона, Колорадо, Юта)',
        '-6': 'UTC -6 (Калифорния, Невада, Орегон)',
        '-5': 'UTC -5 (Нью-Йорк, Куба, Панама, Перу)',
        '-4': 'UTC -4 (Венесуэла, Карибские острова)',
        '-3': 'UTC -3 (Аргентина, Бразилия, Уругвай)',
        '-2': 'UTC -2 (Гренландия)',
        '-1': 'UTC -1 (Кабо-Верде, Азорские острова)',
      };

    module.exports = { backKeyboard, menuKeyboard, menuKeyboardGroup, timeZoneKeyboardOne, timeZoneKeyboardTwo, timeZoneKeyboardThree, timeZoneMap };