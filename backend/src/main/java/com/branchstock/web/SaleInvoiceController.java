package com.branchstock.web;

import com.branchstock.dto.CreateSaleRequest;
import com.branchstock.dto.SaleInvoiceDto;
import com.branchstock.dto.SaleLineItemDto;
import com.branchstock.service.SaleInvoiceService;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@RestController
@RequestMapping("/api/sales")
public class SaleInvoiceController {

    private final SaleInvoiceService saleInvoiceService;

    public SaleInvoiceController(SaleInvoiceService saleInvoiceService) {
        this.saleInvoiceService = saleInvoiceService;
    }

    @GetMapping
    public List<SaleInvoiceDto> list() {
        return saleInvoiceService.list();
    }

    @GetMapping("/{id}")
    public SaleInvoiceDto get(@PathVariable String id) {
        return saleInvoiceService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('BRANCH_USER')")
    public SaleInvoiceDto createInvoice(@RequestBody CreateSaleRequest request) {
        return saleInvoiceService.createInvoice(request);
    }

    @GetMapping("/report")
    public ResponseEntity<Map<String, Object>> report(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String to) {
        List<SaleInvoiceDto> invoices = filterByDate(saleInvoiceService.list(), from, to);
        return ResponseEntity.ok(buildReport(invoices));
    }

    @GetMapping("/export")
    public void export(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) String to,
            HttpServletResponse response) throws IOException {
        List<SaleInvoiceDto> invoices = filterByDate(saleInvoiceService.list(), from, to);

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"sales-" + from + "-to-" + to + ".xlsx\"");

        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Invoice Lines");
            writeLinesSheet(wb, sheet, invoices);
            for (int i = 0; i < 11; i++) sheet.autoSizeColumn(i);

            Sheet custSheet = wb.createSheet("Customers");
            writeCustomersSheet(wb, custSheet, invoices);
            for (int i = 0; i < 7; i++) custSheet.autoSizeColumn(i);

            Sheet sumSheet = wb.createSheet("Summary");
            writeSummarySheet(wb, sumSheet, invoices);
            for (int i = 0; i < 3; i++) sumSheet.autoSizeColumn(i);

            wb.write(response.getOutputStream());
        }
    }

    private List<SaleInvoiceDto> filterByDate(List<SaleInvoiceDto> invoices, String from, String to) {
        Instant fromInst = Instant.parse(from + "T00:00:00Z");
        Instant toInst = Instant.parse(to + "T23:59:59Z");
        return invoices.stream()
                .filter(i -> !i.soldAt().isBefore(fromInst) && !i.soldAt().isAfter(toInst))
                .toList();
    }

    private Map<String, Object> buildReport(List<SaleInvoiceDto> invoices) {
        double grandTotal = 0;
        int itemCount = 0;
        Map<String, double[]> byProduct = new TreeMap<>();
        for (SaleInvoiceDto inv : invoices) {
            for (SaleLineItemDto line : inv.items()) {
                double[] agg = byProduct.computeIfAbsent(line.productName(), k -> new double[2]);
                agg[0] += line.quantity();
                agg[1] += line.amount();
                grandTotal += line.amount();
                itemCount++;
            }
        }
        Map<String, Object> byProductOut = new HashMap<>();
        byProduct.forEach((k, v) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("quantity", (int) v[0]);
            m.put("totalValue", v[1]);
            byProductOut.put(k, m);
        });
        return Map.of(
                "invoiceCount", invoices.size(),
                "itemCount", itemCount,
                "totalValue", grandTotal,
                "byProduct", byProductOut
        );
    }

    private void writeHeader(Workbook wb, Row header, String[] cols) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor((short) 52);
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font font = wb.createFont();
        font.setColor((short) 255);
        style.setFont(font);
        for (int i = 0; i < cols.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(cols[i]);
            cell.setCellStyle(style);
        }
    }

    private void writeLinesSheet(Workbook wb, Sheet sheet, List<SaleInvoiceDto> invoices) {
        String[] cols = {"Invoice No", "Date", "Branch", "Customer", "Customer Phone", "SKU", "Product", "Sold by", "Qty", "Price", "Amount"};
        writeHeader(wb, sheet.createRow(0), cols);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.systemDefault());
        int rowIdx = 1;
        for (SaleInvoiceDto inv : invoices) {
            String customer = inv.customerName() == null ? "" : inv.customerName();
            String phone = inv.customerPhone() == null ? "" : inv.customerPhone();
            for (SaleLineItemDto line : inv.items()) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(inv.invoiceNo());
                row.createCell(1).setCellValue(fmt.format(inv.soldAt()));
                row.createCell(2).setCellValue(inv.branchName());
                row.createCell(3).setCellValue(customer);
                row.createCell(4).setCellValue(phone);
                row.createCell(5).setCellValue(line.sku());
                row.createCell(6).setCellValue(line.productName());
                row.createCell(7).setCellValue(inv.soldBy());
                row.createCell(8).setCellValue(line.quantity());
                row.createCell(9).setCellValue(line.price());
                row.createCell(10).setCellValue(line.amount());
            }
        }
    }

    private void writeCustomersSheet(Workbook wb, Sheet sheet, List<SaleInvoiceDto> invoices) {
        String[] cols = {"Invoice No", "Date", "Branch", "Customer", "Phone", "Email", "Address"};
        writeHeader(wb, sheet.createRow(0), cols);

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.systemDefault());
        int rowIdx = 1;
        for (SaleInvoiceDto inv : invoices) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(inv.invoiceNo());
            row.createCell(1).setCellValue(fmt.format(inv.soldAt()));
            row.createCell(2).setCellValue(inv.branchName() == null ? "" : inv.branchName());
            row.createCell(3).setCellValue(inv.customerName() == null ? "" : inv.customerName());
            row.createCell(4).setCellValue(inv.customerPhone() == null ? "" : inv.customerPhone());
            row.createCell(5).setCellValue(inv.customerEmail() == null ? "" : inv.customerEmail());
            row.createCell(6).setCellValue(inv.customerAddress() == null ? "" : inv.customerAddress());
        }
    }

    private void writeSummarySheet(Workbook wb, Sheet sumSheet, List<SaleInvoiceDto> invoices) {
        String[] cols = {"Product", "Total quantity", "Total value"};
        writeHeader(wb, sumSheet.createRow(0), cols);

        Map<String, double[]> byProduct = new TreeMap<>();
        double grandTotal = 0;
        for (SaleInvoiceDto inv : invoices) {
            for (SaleLineItemDto line : inv.items()) {
                double[] agg = byProduct.computeIfAbsent(line.productName(), k -> new double[2]);
                agg[0] += line.quantity();
                agg[1] += line.amount();
                grandTotal += line.amount();
            }
        }
        int r = 1;
        for (Map.Entry<String, double[]> e : byProduct.entrySet()) {
            Row row = sumSheet.createRow(r++);
            row.createCell(0).setCellValue(e.getKey());
            row.createCell(1).setCellValue((int) e.getValue()[0]);
            row.createCell(2).setCellValue(e.getValue()[1]);
        }

        Row totalRow = sumSheet.createRow(r + 1);
        CellStyle bold = wb.createCellStyle();
        Font boldFont = wb.createFont();
        boldFont.setBold(true);
        bold.setFont(boldFont);
        Cell lbl = totalRow.createCell(0);
        lbl.setCellValue("Grand total");
        lbl.setCellStyle(bold);
        Cell val = totalRow.createCell(2);
        val.setCellValue(grandTotal);
        val.setCellStyle(bold);
    }
}