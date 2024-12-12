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
    .text('ВПЕРЕД ➡️➡️➡️', 'pagetwo')

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
    .text('⬅️⬅️⬅️ НАЗАД', 'pagetwo')