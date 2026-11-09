package com.branchstock.web;

import com.branchstock.domain.RequestStatus;
import com.branchstock.dto.ApproveRequestDto;
import com.branchstock.dto.AdjustLineRequestDto;
import com.branchstock.dto.CreateRequestDto;
import com.branchstock.dto.HoldingDto;
import com.branchstock.dto.StockRequestDto;
import com.branchstock.service.ApprovalCopyService;
import com.branchstock.service.RequestService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class RequestController {

    private final RequestService requestService;
    private final ApprovalCopyService approvalCopyService;

    public RequestController(RequestService requestService, ApprovalCopyService approvalCopyService) {
        this.requestService = requestService;
        this.approvalCopyService = approvalCopyService;
    }

    @GetMapping("/requests")
    public List<StockRequestDto> list() {
        return requestService.list();
    }

    @GetMapping("/requests/status/{status}")
    public List<StockRequestDto> listByStatus(@PathVariable String status) {
        return requestService.listByStatus(RequestStatus.valueOf(status));
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

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public StockRequestDto approve(@PathVariable String id, @RequestBody ApproveRequestDto dto) {
        return requestService.approve(id, dto);
    }

    @PostMapping("/requests/{id}/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    public StockRequestDto adjustLines(@PathVariable String id, @RequestBody AdjustLineRequestDto dto) {
        return requestService.adjustLines(id, dto);
    }

    @GetMapping("/requests/{id}")
    public StockRequestDto get(@PathVariable String id) {
        return requestService.get(id);
    }

    @GetMapping("/requests/{id}/approval-copy")
    public ResponseEntity<byte[]> getApprovalCopy(@PathVariable String id) {
        byte[] xlsx = approvalCopyService.generateApprovalCopy(requestService.get(id));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"approval-copy-" + id + ".xlsx\"")
                .body(xlsx);
    }

    @GetMapping("/holdings")
    public List<HoldingDto> holdings() {
        return requestService.holdings();
    }
}
