package com.branchstock.service;

import com.branchstock.domain.Branch;
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

import java.util.List;

@Service
public class UserAdminService {

    private final UserAccountRepository userRepo;
    private final BranchRepository branchRepo;
    private final PasswordEncoder encoder;

    public UserAdminService(UserAccountRepository userRepo, BranchRepository branchRepo, PasswordEncoder encoder) {
        this.userRepo = userRepo;
        this.branchRepo = branchRepo;
        this.encoder = encoder;
    }

    public List<UserDto> list() {
        return userRepo.findAll().stream().map(this::toDto).toList();
    }

    public UserDto create(CreateUserRequest req) {
        if (req.username() == null || req.username().isBlank()) {
            throw new ApiException("Username is required");
        }
        if (userRepo.existsByUsername(req.username().trim())) {
            throw new ApiException("Username already exists");
        }
        if (req.password() == null || req.password().length() < 6) {
            throw new ApiException("Password must be at least 6 characters");
        }
        String branchId = null;
        String branchName = null;
        if (req.role() == Role.BRANCH_USER) {
            if (req.branchId() == null || req.branchId().isBlank()) {
                throw new ApiException("Branch is required for branch users");
            }
            Branch branch = branchRepo.findById(req.branchId()).orElseThrow(() -> new ApiException("Branch not found"));
            branchId = branch.getId();
            branchName = branch.getName();
        }
        UserAccount user = userRepo.save(UserAccount.builder()
                .username(req.username().trim())
                .passwordHash(encoder.encode(req.password()))
                .displayName(req.displayName() == null || req.displayName().isBlank() ? req.username().trim() : req.displayName())
                .role(req.role() == null ? Role.BRANCH_USER : req.role())
                .branchId(branchId)
                .branchName(branchName)
                .active(true)
                .build());
        return toDto(user);
    }

    public UserDto update(String id, CreateUserRequest req) {
        UserAccount user = userRepo.findById(id).orElseThrow(() -> new ApiException("User not found"));
        if ("admin".equals(user.getUsername())) {
            throw new ApiException("The admin user cannot be modified");
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
                if (req.branchId() == null || req.branchId().isBlank()) {
                    throw new ApiException("Branch is required for branch users");
                }
                Branch branch = branchRepo.findById(req.branchId()).orElseThrow(() -> new ApiException("Branch not found"));
                user.setBranchId(branch.getId());
                user.setBranchName(branch.getName());
            } else {
                user.setBranchId(null);
                user.setBranchName(null);
            }
            user.setRole(req.role());
        }
        if (req.active() != null) {
            user.setActive(req.active());
        }
        return toDto(userRepo.save(user));
    }

    public void changePassword(String userId, ChangePasswordRequest req, boolean isAdmin) {
        UserAccount user = userRepo.findById(userId).orElseThrow(() -> new ApiException("User not found"));
        if (!isAdmin) {
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
                u.isActive()
        );
    }
}
