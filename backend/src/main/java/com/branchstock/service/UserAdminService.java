package com.branchstock.service;

import com.branchstock.domain.Branch;
import com.branchstock.domain.Permission;
import com.branchstock.domain.Role;
import com.branchstock.domain.UserAccount;
import com.branchstock.dto.ChangePasswordRequest;
import com.branchstock.dto.CreateUserRequest;
import com.branchstock.dto.UserDto;
import com.branchstock.repo.BranchRepository;
import com.branchstock.repo.UserAccountRepository;
import com.branchstock.web.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * User management. Admins can do everything. A sub-admin who was granted USERS_MANAGE may only
 * manage branch users and other sub-admins, may never touch admin accounts or their own account,
 * and can only grant permissions they hold themselves (no privilege escalation).
 */
@Service
public class UserAdminService {

    private final UserAccountRepository userRepo;
    private final BranchRepository branchRepo;
    private final PasswordEncoder encoder;
    private final CurrentUserService currentUser;

    public UserAdminService(UserAccountRepository userRepo, BranchRepository branchRepo, PasswordEncoder encoder, CurrentUserService currentUser) {
        this.userRepo = userRepo;
        this.branchRepo = branchRepo;
        this.encoder = encoder;
        this.currentUser = currentUser;
    }

    public List<UserDto> list() {
        return userRepo.findAll().stream().map(this::toDto).toList();
    }

    public UserDto create(CreateUserRequest req) {
        UserAccount actor = currentUser.requireUser();
        if (req.username() == null || req.username().isBlank()) {
            throw new ApiException("Username is required");
        }
        if (userRepo.existsByUsername(req.username().trim())) {
            throw new ApiException("Username already exists");
        }
        if (req.password() == null || req.password().length() < 6) {
            throw new ApiException("Password must be at least 6 characters");
        }
        Role role = req.role() == null ? Role.BRANCH_USER : req.role();
        assertCanAssignRole(actor, role);

        String branchId = null;
        String branchName = null;
        if (role == Role.BRANCH_USER) {
            Branch branch = requireBranch(req.branchId());
            branchId = branch.getId();
            branchName = branch.getName();
        }
        UserAccount user = userRepo.save(UserAccount.builder()
                .username(req.username().trim())
                .passwordHash(encoder.encode(req.password()))
                .displayName(req.displayName() == null || req.displayName().isBlank() ? req.username().trim() : req.displayName())
                .role(role)
                .branchId(branchId)
                .branchName(branchName)
                .permissions(resolvePermissions(actor, role, req.permissions()))
                .active(true)
                .build());
        return toDto(user);
    }

    public UserDto update(String id, CreateUserRequest req) {
        UserAccount actor = currentUser.requireUser();
        boolean actorIsAdmin = actor.getRole() == Role.ADMIN;
        UserAccount user = userRepo.findById(id).orElseThrow(() -> new ApiException("User not found"));
        if ("admin".equals(user.getUsername())) {
            throw new ApiException("The admin user cannot be modified");
        }
        boolean editingSelf = actor.getId().equals(id);
        if (editingSelf && (Boolean.FALSE.equals(req.active()) || (req.role() != null && req.role() != Role.ADMIN && actorIsAdmin))) {
            throw new ApiException("You cannot deactivate or demote your own account");
        }
        if (!actorIsAdmin) {
            if (editingSelf) {
                throw new ApiException("You cannot edit your own account");
            }
            if (user.getRole() == Role.ADMIN) {
                throw new ApiException("Only an admin can edit admin accounts");
            }
            if (!Permission.effective(actor).containsAll(Permission.effective(user))) {
                throw new ApiException("You cannot edit a user who has permissions you do not have");
            }
        }
        if (req.role() != null) {
            assertCanAssignRole(actor, req.role());
        }

        if (req.username() != null && !req.username().isBlank()) {
            userRepo.findByUsername(req.username().trim()).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new ApiException("Username already exists");
                }
            });
            user.setUsername(req.username().trim());
        }
        if (req.password() != null && !req.password().isBlank()) {
            if (req.password().length() < 6) {
                throw new ApiException("Password must be at least 6 characters");
            }
            user.setPasswordHash(encoder.encode(req.password()));
        }
        if (req.displayName() != null && !req.displayName().isBlank()) {
            user.setDisplayName(req.displayName().trim());
        }
        if (req.role() != null) {
            if (req.role() == Role.BRANCH_USER) {
                Branch branch = requireBranch(req.branchId());
                user.setBranchId(branch.getId());
                user.setBranchName(branch.getName());
            } else {
                user.setBranchId(null);
                user.setBranchName(null);
            }
            user.setRole(req.role());
        }
        if (user.getRole() == Role.SUBADMIN) {
            if (req.permissions() != null) {
                user.setPermissions(resolvePermissions(actor, Role.SUBADMIN, req.permissions()));
            }
        } else {
            user.setPermissions(new ArrayList<>());
        }
        if (req.active() != null) {
            user.setActive(req.active());
        }
        return toDto(userRepo.save(user));
    }

    /** Admin/user-manager resetting somebody else's password (no current password needed). */
    public void resetPassword(String userId, ChangePasswordRequest req) {
        UserAccount actor = currentUser.requireUser();
        UserAccount target = userRepo.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        if (actor.getRole() != Role.ADMIN) {
            if (actor.getId().equals(userId)) {
                throw new ApiException("Use Change password in your account menu");
            }
            if (target.getRole() == Role.ADMIN) {
                throw new ApiException("Only an admin can reset an admin's password");
            }
        }
        changePassword(userId, req, true);
    }

    public void changePassword(String userId, ChangePasswordRequest req, boolean skipCurrentCheck) {
        UserAccount user = userRepo.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        if (!skipCurrentCheck) {
            if (req.currentPassword() == null || !encoder.matches(req.currentPassword(), user.getPasswordHash())) {
                throw new ApiException("Current password is incorrect");
            }
        }
        if (req.newPassword() == null || req.newPassword().length() < 6) {
            throw new ApiException("New password must be at least 6 characters");
        }
        user.setPasswordHash(encoder.encode(req.newPassword()));
        userRepo.save(user);
    }

    public UserDto toDto(UserAccount u) {
        return new UserDto(
                u.getId(),
                u.getUsername(),
                u.getDisplayName(),
                u.getRole(),
                u.getBranchId(),
                u.getBranchName(),
                u.isActive(),
                Permission.effectiveNames(u)
        );
    }

    // ------------------------------------------------------------------ helpers

    private void assertCanAssignRole(UserAccount actor, Role role) {
        if (actor.getRole() != Role.ADMIN && role == Role.ADMIN) {
            throw new ApiException("Only an admin can create or edit admin accounts");
        }
    }

    private Branch requireBranch(String branchId) {
        if (branchId == null || branchId.isBlank()) {
            throw new ApiException("Branch is required for branch users");
        }
        return branchRepo.findById(branchId).orElseThrow(() -> new ApiException("Branch not found"));
    }

    /** Only sub-admins carry permissions; a granter can never hand out more than they hold. */
    private List<String> resolvePermissions(UserAccount actor, Role role, List<String> requested) {
        List<String> result = new ArrayList<>();
        if (role != Role.SUBADMIN || requested == null) {
            return result;
        }
        Set<Permission> granted = EnumSet.noneOf(Permission.class);
        Set<Permission> actorPermissions = Permission.effective(actor);
        for (String name : requested) {
            Permission permission;
            try {
                permission = Permission.valueOf(name);
            } catch (IllegalArgumentException | NullPointerException e) {
                throw new ApiException("Unknown permission: " + name);
            }
            if (!actorPermissions.contains(permission)) {
                throw new ApiException("You cannot grant a permission you do not have: " + permission);
            }
            granted.add(permission);
        }
        granted.forEach(p -> result.add(p.name()));
        return result;
    }
}
