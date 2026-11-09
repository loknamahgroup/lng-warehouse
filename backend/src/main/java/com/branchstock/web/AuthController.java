package com.branchstock.web;

import com.branchstock.security.LoginAttemptService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.AuthenticationException;
import com.branchstock.domain.UserAccount;
import com.branchstock.dto.ChangePasswordRequest;
import com.branchstock.dto.LoginRequest;
import com.branchstock.dto.LoginResponse;
import com.branchstock.dto.UserDto;
import com.branchstock.security.JwtService;
import com.branchstock.service.CurrentUserService;
import com.branchstock.service.UserAdminService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;
    private final CurrentUserService currentUser;
    private final UserAdminService userAdminService;
    private final LoginAttemptService loginAttempts;

    public AuthController(
            AuthenticationManager authManager,
            JwtService jwtService,
            CurrentUserService currentUser,
            UserAdminService userAdminService,
            LoginAttemptService loginAttempts
    ) {
        this.authManager = authManager;
        this.jwtService = jwtService;
        this.currentUser = currentUser;
        this.userAdminService = userAdminService;
        this.loginAttempts = loginAttempts;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String key = httpRequest.getRemoteAddr() + "|" + String.valueOf(request.username()).trim().toLowerCase();
        if (loginAttempts.isBlocked(key)) {
            throw new ApiException("Too many failed attempts. Try again in 15 minutes.");
        }
        try {
            authManager.authenticate(new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        } catch (AuthenticationException ex) {
            loginAttempts.recordFailure(key);
            throw ex;
        }
        loginAttempts.recordSuccess(key);
        UserAccount user = currentUser.requireByUsername(request.username());
        return new LoginResponse(
                jwtService.generate(user),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole(),
                user.getBranchId(),
                user.getBranchName()
        );
    }

    @GetMapping("/me")
    public UserDto me() {
        return userAdminService.toDto(currentUser.requireUser());
    }

    @PostMapping("/change-password")
    public Map<String, String> changePassword(@RequestBody ChangePasswordRequest request) {
        UserAccount user = currentUser.requireUser();
        userAdminService.changePassword(user.getId(), request, false);
        return Map.of("message", "Password updated");
    }
}
