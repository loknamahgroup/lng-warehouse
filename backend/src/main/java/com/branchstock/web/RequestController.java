package com.branchstock.web;

import com.branchstock.dto.CreateRequestDto;
import com.branchstock.dto.HoldingDto;
import com.branchstock.dto.StockRequestDto;
import com.branchstock.service.RequestService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class RequestController {

    private final RequestService requestService;

    public RequestController(RequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping("/requests")
    public List<StockRequestDto> list() {
        return requestService.list();
    }

    @PostMapping("/requests")
    @PreAuthorize("hasRole('BRANCH_USER')")
    public StockRequestDto create(@RequestBody CreateRequestDto dto) {
        return requestService.create(dto);
    }

    @PostMapping("/requests/{id}/cancel")
    public StockRequestDto cancel(@PathVariable String id) {
        return requestService.cancel(id);
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public StockRequestDto reject(@PathVariable String id) {
        return requestService.reject(id);
    }

    @PostMapping("/requests/{id}/fulfill")
    @PreAuthorize("hasRole('ADMIN')")
    public StockRequestDto fulfill(@PathVariable String id) {
        return requestService.fulfill(id);
    }

    @GetMapping("/holdings")
    public List<HoldingDto> holdings() {
        return requestService.holdings();
    }
}
