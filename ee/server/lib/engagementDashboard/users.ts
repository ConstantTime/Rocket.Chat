import moment from 'moment';

import { Users, Analytics, Sessions } from '../../../../app/models/server/raw';
import { convertDateToInt, diffBetweenDaysInclusive, getTotalOfWeekItems, convertIntToDate } from './date';
import type { IUser } from '../../../../definition/IUser';
import type { ISession } from '../../../../definition/ISession';

export const handleUserCreated = (user: IUser): IUser => {
	if (user.roles?.includes('anonymous')) {
		return user;
	}

	Promise.await(Analytics.saveUserData({
		date: convertDateToInt(user.createdAt),
	}));

	return user;
};

export const fillFirstDaysOfUsersIfNeeded = async (date: Date): Promise<void> => {
	const usersFromAnalytics = await Analytics.findByTypeBeforeDate({
		type: 'users',
		date: convertDateToInt(date),
	}).toArray();
	if (!usersFromAnalytics.length) {
		const startOfPeriod = moment(date).subtract(90, 'days').toDate();
		const users = await Users.getTotalOfRegisteredUsersByDate({
			start: startOfPeriod,
			end: date,
		});
		users.forEach((user) => Analytics.insertOne({
			...user,
			date: parseInt(user.date),
		}));
	}
};

export const findWeeklyUsersRegisteredData = async ({ start, end }: { start: Date; end: Date }): Promise<{
	days: { day: Date; users: number }[];
	period: {
		count: number;
		variation: number;
	};
	yesterday: {
		count: number;
		variation: number;
	};
}> => {
	const daysBetweenDates = diffBetweenDaysInclusive(end, start);
	const endOfLastWeek = moment(start).clone().subtract(1, 'days').toDate();
	const startOfLastWeek = moment(endOfLastWeek).clone().subtract(daysBetweenDates, 'days').toDate();
	const today = convertDateToInt(end);
	const yesterday = convertDateToInt(moment(end).clone().subtract(1, 'days').toDate());
	const currentPeriodUsers = await Analytics.getTotalOfRegisteredUsersByDate({
		start: convertDateToInt(start),
		end: convertDateToInt(end),
		options: { count: daysBetweenDates, sort: { _id: -1 } },
	}).toArray();
	const lastPeriodUsers = await Analytics.getTotalOfRegisteredUsersByDate({
		start: convertDateToInt(startOfLastWeek),
		end: convertDateToInt(endOfLastWeek),
		options: { count: daysBetweenDates, sort: { _id: -1 } },
	}).toArray();
	const yesterdayUsers = (currentPeriodUsers.find((item) => item._id === yesterday) || {}).users || 0;
	const todayUsers = (currentPeriodUsers.find((item) => item._id === today) || {}).users || 0;
	const currentPeriodTotalUsers = getTotalOfWeekItems(currentPeriodUsers, 'users');
	const lastPeriodTotalUsers = getTotalOfWeekItems(lastPeriodUsers, 'users');
	return {
		days: currentPeriodUsers.map((day) => ({ day: convertIntToDate(day._id), users: day.users })),
		period: {
			count: currentPeriodTotalUsers,
			variation: currentPeriodTotalUsers - lastPeriodTotalUsers,
		},
		yesterday: {
			count: yesterdayUsers,
			variation: todayUsers - yesterdayUsers,
		},
	};
};

const toDestructuredDate = (date: moment.Moment) => ({
	year: date.year(),
	month: date.month() + 1,
	day: date.date(),
}) as const;

export const findActiveUsersMonthlyData = async ({ start, end }: { start: Date; end: Date }): Promise<{
	month: ISession[];
}> => {
	const startOfPeriod = moment(start);
	const endOfPeriod = moment(end);

	return {
		month: await Sessions.getActiveUsersOfPeriodByDayBetweenDates({
			start: toDestructuredDate(startOfPeriod),
			end: toDestructuredDate(endOfPeriod),
		}),
	};
};

export const findBusiestsChatsInADayByHours = async ({ start }: { start: Date }): Promise<{
	hours: ISession[];
}> => {
	const now = moment(start);
	const yesterday = moment(now).clone().subtract(24, 'hours');
	return {
		hours: await Sessions.getBusiestTimeWithinHoursPeriod({
			start: toDestructuredDate(yesterday),
			end: toDestructuredDate(now),
			groupSize: 2,
		}),
	};
};

export const findBusiestsChatsWithinAWeek = async ({ start }: { start: Date }): Promise<{
	month: ISession[];
}> => {
	const today = moment(start);
	const startOfCurrentWeek = moment(today).clone().subtract(7, 'days');

	return {
		month: await Sessions.getTotalOfSessionsByDayBetweenDates({
			start: toDestructuredDate(startOfCurrentWeek),
			end: toDestructuredDate(today),
		}),
	};
};

export const findUserSessionsByHourWithinAWeek = async ({ start, end }: { start: Date; end: Date }): Promise<{
	week: ISession[];
}> => {
	const startOfPeriod = moment(start);
	const endOfPeriod = moment(end);

	return {
		week: await Sessions.getTotalOfSessionByHourAndDayBetweenDates({
			start: toDestructuredDate(startOfPeriod),
			end: toDestructuredDate(endOfPeriod),
		}),
	};
};
