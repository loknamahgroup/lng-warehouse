package com.branchstock.service;

import com.branchstock.domain.Role;
import com.branchstock.domain.UserAccount;
import com.branchstock.repo.UserAccountRepository;
import com.branchstock.web.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserAccountRepository userRepo;

    public CurrentUserService(UserAccountRepository userRepo) {
        this.userRepo = userRepo;
    }

    public UserAccount requireUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ApiException("Not authenticated");
        }
        return requireByUsername(auth.getName());
    }

    public UserAccount requireByUsername(String username) {
        return userRepo.findByUsername(username).orElseThrow(() -> new ApiException("User not found"));
    }

    public boolean isAdmin() {
        return requireUser().getRole() == Role.ADMIN;
    }
}
