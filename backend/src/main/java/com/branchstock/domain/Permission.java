package com.branchstock.domain;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Features an admin can grant to a sub-admin. Admins implicitly hold all of them;
 * branch users hold none. Dashboard, stock, orders, holdings and sales are visible
 * (read-only) to every staff account without any permission.
 */
public enum Permission {
    REQUESTS_APPROVE,
    STOCK_MANAGE,
    PRODUCTS_MANAGE,
    BRANCHES_MANAGE,
    USERS_MANAGE,
    MOVEMENTS_VIEW;

    public static Set<Permission> effective(UserAccount user) {
        EnumSet<Permission> result = EnumSet.noneOf(Permission.class);
        if (user == null || user.getRole() == null) {
            return result;
        }
        if (user.getRole() == Role.ADMIN) {
            result.addAll(EnumSet.allOf(Permission.class));
        } else if (user.getRole() == Role.SUBADMIN && user.getPermissions() != null) {
            for (String name : user.getPermissions()) {
                try {
                    result.add(Permission.valueOf(name));
                } catch (IllegalArgumentException ignored) {
                    // unknown/legacy value stored in the database: ignore
                }
            }
        }
        return result;
    }

    public static List<String> effectiveNames(UserAccount user) {
        return effective(user).stream().map(Enum::name).toList();
    }

    /** Spring Security authority string, e.g. PERM_STOCK_MANAGE */
    public String authority() {
        return "PERM_" + name();
    }
}
