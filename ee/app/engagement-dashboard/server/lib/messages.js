import moment from 'moment';

import { roomTypes } from '../../../../../app/utils';
import { Messages, Analytics } from '../../../../../app/models/server/raw';
import { convertDateToInt, diffBetweenDaysInclusive, convertIntToDate, getTotalOfWeekItems } from './date';

export const handleMessagesSent = (message, room) => {
	const roomTypesToShow = roomTypes.getTypesToShowOnDashboard();
	if (!roomTypesToShow.includes(room.t)) {
		return message;
	}
	Promise.await(Analytics.saveMessageSent({
		date: convertDateToInt(message.ts),
		room,
	}));
	return message;
};

export const handleMessagesDeleted = (message, room) => {
	const roomTypesToShow = roomTypes.getTypesToShowOnDashboard();
	if (!roomTypesToShow.includes(room.t)) {
		return;
	}
	Promise.await(Analytics.saveMessageDeleted({
		date: convertDateToInt(message.ts),
		room,
	}));
	return message;
};

export const fillFirstDaysOfMessagesIfNeeded = async (date) => {
	const messagesFromAnalytics = await Analytics.findByTypeBeforeDate({
		type: 'messages',
		date: convertDateToInt(date),
	}).toArray();
	if (!messagesFromAnalytics.length) {
		const startOfPeriod = moment(convertIntToDate(date)).subtract(90, 'days').toDate();
		const messages = await Messages.getTotalOfMessagesSentByDate({
			start: startOfPeriod,
			end: date,
		});
		await Promise.all(messages.map((message) => Analytics.insertOne({
			...message,
			date: parseInt(message.date),
		})));
	}
};

export const findWeeklyMessagesSentData = async ({ start, end }) => {
	const daysBetweenDates = diffBetweenDaysInclusive(end, start);
	const endOfLastWeek = moment(start).clone().subtract(1, 'days').toDate();
	const startOfLastWeek = moment(endOfLastWeek).clone().subtract(daysBetweenDates, 'days').toDate();
	const today = convertDateToInt(end);
	const yesterday = convertDateToInt(moment(end).clone().subtract(1, 'days').toDate());
	const currentPeriodMessages = await Analytics.getMessagesSentTotalByDate({
		start: convertDateToInt(start),
		end: convertDateToInt(end),
		options: { count: daysBetweenDates, sort: { _id: -1 } },
	}).toArray();
	const lastPeriodMessages = await Analytics.getMessagesSentTotalByDate({
		start: convertDateToInt(startOfLastWeek),
		end: convertDateToInt(endOfLastWeek),
		options: { count: daysBetweenDates, sort: { _id: -1 } },
	}).toArray();
	const yesterdayMessages = (currentPeriodMessages.find((item) => item._id === yesterday) || {}).messages || 0;
	const todayMessages = (currentPeriodMessages.find((item) => item._id === today) || {}).messages || 0;
	const currentPeriodTotalOfMessages = getTotalOfWeekItems(currentPeriodMessages, 'messages');
	const lastPeriodTotalOfMessages = getTotalOfWeekItems(lastPeriodMessages, 'messages');
	return {
		days: currentPeriodMessages.map((day) => ({ day: convertIntToDate(day._id), messages: day.messages })),
		period: {
			count: currentPeriodTotalOfMessages,
			variation: currentPeriodTotalOfMessages - lastPeriodTotalOfMessages,
		},
		yesterday: {
			count: yesterdayMessages,
			variation: todayMessages - yesterdayMessages,
		},
	};
};

export const findMessagesSentOrigin = async ({ start, end }) => {
	const origins = await Analytics.getMessagesOrigin({
		start: convertDateToInt(start),
		end: convertDateToInt(end),
	}).toArray();
	const roomTypesToShow = roomTypes.getTypesToShowOnDashboard();
	const responseTypes = origins.map((origin) => origin.t);
	const missingTypes = roomTypesToShow.filter((type) => !responseTypes.includes(type));
	if (missingTypes.length) {
		missingTypes.forEach((type) => origins.push({ messages: 0, t: type }));
	}
	return { origins };
};

export const findTopFivePopularChannelsByMessageSentQuantity = async ({ start, end }) => {
	const channels = await Analytics.getMostPopularChannelsByMessagesSentQuantity({
		start: convertDateToInt(start),
		end: convertDateToInt(end),
		options: { count: 5, sort: { messages: -1 } },
	}).toArray();
	return { channels };
};
