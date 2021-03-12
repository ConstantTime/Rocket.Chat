import { Promise } from 'meteor/promise';

import { API } from '../api';
import { Team } from '../../../../server/sdk';
import { hasPermission } from '../../../authorization/server';

API.v1.addRoute('teams.list', { authRequired: true }, {
	get() {
		const { offset, count } = this.getPaginationItems();

		const { records, total } = Promise.await(Team.list(this.userId, { offset, count }));

		return API.v1.success({
			teams: records,
			total,
			count: records.length,
			offset,
		});
	},
});

API.v1.addRoute('teams.listAll', { authRequired: true }, {
	get() {
		if (!hasPermission(this.userId, 'view-all-teams')) {
			return API.v1.unauthorized();
		}

		const { offset, count } = this.getPaginationItems();

		const { records, total } = Promise.await(Team.listAll({ offset, count }));

		return API.v1.success({
			teams: records,
			total,
			count: records.length,
			offset,
		});
	},
});

API.v1.addRoute('teams.create', { authRequired: true }, {
	post() {
		const { name, type, members, room, owner } = this.bodyParams;

		if (!name) {
			return API.v1.failure('Body param "name" is required');
		}

		const team = Promise.await(Team.create(this.userId, {
			team: {
				name,
				type,
			},
			room,
			members,
			owner,
		}));

		return API.v1.success({ team });
	},
});

API.v1.addRoute('teams.members', { authRequired: true }, {
	get() {
		const { offset, count } = this.getPaginationItems();
		const { teamId, teamName } = this.queryParams;

		const { records, total } = Promise.await(Team.members(this.userId, teamId, teamName, { offset, count }));

		return API.v1.success({
			members: records,
			total,
			count: records.length,
			offset,
		});
	},
});

API.v1.addRoute('teams.addMembers', { authRequired: true }, {
	post() {
		const { teamId, teamName, members } = this.bodyParams;

		Promise.await(Team.addMembers(this.userId, teamId, teamName, members));

		return API.v1.success();
	},
});

API.v1.addRoute('teams.updateMember', { authRequired: true }, {
	post() {
		const { teamId, teamName, member } = this.bodyParams;

		Promise.await(Team.updateMember(this.userId, teamId, teamName, member));

		return API.v1.success();
	},
});

API.v1.addRoute('teams.removeMembers', { authRequired: true }, {
	post() {
		const { teamId, teamName, members } = this.bodyParams;

		Promise.await(Team.removeMembers(this.userId, teamId, teamName, members));

		return API.v1.success();
	},
});

API.v1.addRoute('teams.leave', { authRequired: true }, {
	post() {
		const { teamId, teamName } = this.bodyParams;

		Promise.await(Team.removeMembers(this.userId, teamId, teamName, [{
			userId: this.userId,
		}]));

		return API.v1.success();
	},
});