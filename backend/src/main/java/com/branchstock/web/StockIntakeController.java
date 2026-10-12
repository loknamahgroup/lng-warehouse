package com.branchstock.web;

import com.branchstock.dto.CreateStockIntakeRequest;
import com.branchstock.dto.StockIntakeDto;
import com.branchstock.service.StockIntakeService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse/intakes")
@PreAuthorize("hasRole('ADMIN')")
public class StockIntakeController {

    private final StockIntakeService intakeService;

    public StockIntakeController(StockIntakeService intakeService) {
        this.intakeService = intakeService;
    }

    @GetMapping
    public List<StockIntakeDto> list() {
        return intakeService.list();
    }

    @GetMapping("/{id}")
    public StockIntakeDto get(@PathVariable String id) {
        return intakeService.get(id);
    }

    @PostMapping
    public StockIntakeDto create(@RequestBody CreateStockIntakeRequest request) {
        return intakeService.create(request);
    }

    @GetMapping("/export")
    public void export(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        java.util.List<StockIntakeDto> rows = intakeService.list();
        java.time.LocalDate f = parseDate(from);
        java.time.LocalDate t = parseDate(to);
        java.util.List<StockIntakeDto> filtered = rows.stream().filter(r -> {
            if (r.createdAt() == null) {
                return true;
            }
            java.time.LocalDate d = r.createdAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            if (f != null && d.isBefore(f)) {
                return false;
            }
            return t == null || !d.isAfter(t);
        }).toList();
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=warehouse-intakes.xlsx");
        try (org.apache.poi.ss.usermodel.Workbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet s1 = wb.createSheet("Intakes");
            String[] h1 = {"Intake No", "Date", "Mode", "Supplier", "Reference",
                    "Updated By", "Login User", "Products", "Total Qty", "Total Cost", "Note", "Details"};
            org.apache.poi.ss.usermodel.Row hr = s1.createRow(0);
            for (int i = 0; i < h1.length; i++) {
                hr.createCell(i).setCellValue(h1[i]);
            }
            int r = 1;
            for (StockIntakeDto d : filtered) {
                org.apache.poi.ss.usermodel.Row row = s1.createRow(r++);
                row.createCell(0).setCellValue(nz(d.intakeNo()));
                row.createCell(1).setCellValue(d.createdAt() == null ? "" : d.createdAt().toString());
                row.createCell(2).setCellValue(nz(d.mode()));
                row.createCell(3).setCellValue(nz(d.supplier()));
                row.createCell(4).setCellValue(nz(d.referenceNo()));
                row.createCell(5).setCellValue(nz(d.updatedBy()));
                row.createCell(6).setCellValue(nz(d.updatedByUsername()));
                row.createCell(7).setCellValue(d.lineCount());
                row.createCell(8).setCellValue(d.totalQuantity());
                row.createCell(9).setCellValue(d.totalCost());
                row.createCell(10).setCellValue(nz(d.note()));
                row.createCell(11).setCellValue(nz(d.details()));
            }
            for (int i = 0; i < h1.length; i++) {
                s1.autoSizeColumn(i);
            }
            org.apache.poi.ss.usermodel.Sheet s2 = wb.createSheet("Lines");
            String[] h2 = {"Intake No", "Date", "SKU", "Product",
                    "Entered Qty", "Unit Cost", "Line Cost", "Before", "After", "Unit"};
            org.apache.poi.ss.usermodel.Row hr2 = s2.createRow(0);
            for (int i = 0; i < h2.length; i++) {
                hr2.createCell(i).setCellValue(h2[i]);
            }
            int r2 = 1;
            for (StockIntakeDto d : filtered) {
                if (d.lines() == null) {
                    continue;
                }
                for (com.branchstock.dto.StockIntakeLineDto l : d.lines()) {
                    org.apache.poi.ss.usermodel.Row row = s2.createRow(r2++);
                    row.createCell(0).setCellValue(nz(d.intakeNo()));
                    row.createCell(1).setCellValue(d.createdAt() == null ? "" : d.createdAt().toString());
                    row.createCell(2).setCellValue(nz(l.sku()));
                    row.createCell(3).setCellValue(nz(l.productName()));
                    row.createCell(4).setCellValue(l.quantity());
                    row.createCell(5).setCellValue(l.unitCost());
                    row.createCell(6).setCellValue(l.lineCost());
                    row.createCell(7).setCellValue(l.previousOnHand());
                    row.createCell(8).setCellValue(l.newOnHand());
                    row.createCell(9).setCellValue(nz(l.unit()));
                }
            }
            for (int i = 0; i < h2.length; i++) {
                s2.autoSizeColumn(i);
            }
            wb.write(response.getOutputStream());
        }
    }

    private java.time.LocalDate parseDate(String v) {
        if (v == null || v.isBlank()) {
            return null;
        }
        return java.time.LocalDate.parse(v.trim());
    }

    private String nz(String v) {
        return v == null ? "" : v;
    }
}
