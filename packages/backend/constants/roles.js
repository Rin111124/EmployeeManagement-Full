const ROLES = Object.freeze({
    ADMIN: 'Admin',
    HR: 'HR',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
});

const MANAGEMENT_ROLES = Object.freeze([ROLES.ADMIN, ROLES.HR, ROLES.MANAGER]);

module.exports = {
    MANAGEMENT_ROLES,
    ROLES,
};
