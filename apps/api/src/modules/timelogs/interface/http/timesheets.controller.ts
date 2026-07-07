import {
  ROUTES,
  submitTimesheetSchema,
  timesheetStatusQuerySchema,
  timesheetSubmissionsQuerySchema,
  timesheetSubmitPreviewQuerySchema,
  missingTimesheetQuerySchema,
  pendingTimesheetQuerySchema,
  reviewedTimesheetQuerySchema,
  amendmentListQuerySchema,
  remindTimesheetSchema,
  createAmendmentRequestSchema,
  reviewAmendmentSchema,
  approveTimesheetSchema,
  rejectTimesheetSchema,
  bulkReviewTimesheetSchema
} from "@kloqra/contracts";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { Roles } from "../../../../common/decorators/roles.decorator";
import {
  WorkspaceUser,
  type WorkspaceRequestUser
} from "../../../../common/decorators/workspace-user.decorator";
import { AdminOrProjectManagerGuard } from "../../../../common/guards/admin-or-project-manager.guard";
import { JwtAuthGuard } from "../../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe";
import { TimesheetAmendmentsService } from "../../application/timesheet-amendments.service";
import { TimesheetsService } from "../../application/timesheets.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimesheetsController {
  constructor(
    private timesheets: TimesheetsService,
    private amendments: TimesheetAmendmentsService
  ) {}

  @Get(ROUTES.TIMESHEETS.MY_STATUS)
  async getStatus(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(timesheetStatusQuerySchema))
    query: z.infer<typeof timesheetStatusQuerySchema>
  ) {
    const targetDate = query.date || new Date().toISOString();
    return this.timesheets.getStatus(user.workspaceId, user.userId, query.projectId, targetDate);
  }

  @Get(ROUTES.TIMESHEETS.MY_SUBMISSIONS)
  async listSubmissions(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(timesheetSubmissionsQuerySchema))
    query: z.infer<typeof timesheetSubmissionsQuerySchema>
  ) {
    const targetDate = query.date || new Date().toISOString();
    return this.timesheets.listSubmissions(
      user.workspaceId,
      user.userId,
      targetDate,
      query.scope,
      query.lookbackWeeks
    );
  }

  @Get(ROUTES.TIMESHEETS.SUBMIT_PREVIEW)
  async getSubmitPreview(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(timesheetSubmitPreviewQuerySchema))
    query: z.infer<typeof timesheetSubmitPreviewQuerySchema>
  ) {
    const targetDate = query.date || new Date().toISOString();
    return this.timesheets.getSubmitPreview(
      user.workspaceId,
      user.userId,
      query.projectId,
      targetDate
    );
  }

  @Post(ROUTES.TIMESHEETS.SUBMIT)
  async submit(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(submitTimesheetSchema)) body: z.infer<typeof submitTimesheetSchema>
  ) {
    return this.timesheets.submit(
      user.workspaceId,
      user.userId,
      body.projectId,
      body.date,
      body.note,
      body.confirmCascade
    );
  }

  @Post(ROUTES.TIMESHEETS.CREATE_AMENDMENT(":periodId"))
  async createAmendment(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("periodId") periodId: string,
    @Body(new ZodValidationPipe(createAmendmentRequestSchema))
    body: z.infer<typeof createAmendmentRequestSchema>
  ) {
    return this.amendments.create(user.workspaceId, user.userId, periodId, body.reason);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Get(ROUTES.TIMESHEETS.LIST_PENDING)
  async listPending(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(pendingTimesheetQuerySchema))
    query: z.infer<typeof pendingTimesheetQuerySchema>
  ) {
    return this.timesheets.listPending(user.workspaceId, user.userId, user.role, query);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Get(ROUTES.TIMESHEETS.LIST_APPROVED)
  async listApproved(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reviewedTimesheetQuerySchema))
    query: z.infer<typeof reviewedTimesheetQuerySchema>
  ) {
    return this.timesheets.listApproved(user.workspaceId, user.userId, user.role, query);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Get(ROUTES.TIMESHEETS.LIST_REJECTED)
  async listRejected(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reviewedTimesheetQuerySchema))
    query: z.infer<typeof reviewedTimesheetQuerySchema>
  ) {
    return this.timesheets.listRejected(user.workspaceId, user.userId, user.role, query);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Get(ROUTES.TIMESHEETS.LIST_ALL)
  async listAll(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(reviewedTimesheetQuerySchema))
    query: z.infer<typeof reviewedTimesheetQuerySchema>
  ) {
    return this.timesheets.listAll(user.workspaceId, user.userId, user.role, query);
  }

  @Roles("ADMIN")
  @Get(ROUTES.TIMESHEETS.LIST_MISSING)
  async listMissing(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(missingTimesheetQuerySchema))
    query: z.infer<typeof missingTimesheetQuerySchema>
  ) {
    const targetDate = query.date || new Date().toISOString();
    const { date: _date, ...filter } = query;
    return this.timesheets.listMissing(user.workspaceId, targetDate, filter);
  }

  @Roles("ADMIN")
  @Post(ROUTES.TIMESHEETS.REMIND)
  async remind(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(remindTimesheetSchema)) body: z.infer<typeof remindTimesheetSchema>
  ) {
    return this.timesheets.remindMember(
      user.workspaceId,
      user.userId,
      body.userId,
      body.projectId,
      body.date,
      body.message
    );
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Get(ROUTES.TIMESHEETS.LIST_AMENDMENTS)
  async listAmendments(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Query(new ZodValidationPipe(amendmentListQuerySchema))
    query: z.infer<typeof amendmentListQuerySchema>
  ) {
    return this.amendments.listPending(user.workspaceId, user.userId, user.role, query);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Patch(ROUTES.TIMESHEETS.APPROVE_AMENDMENT(":id"))
  async approveAmendment(@WorkspaceUser() user: WorkspaceRequestUser, @Param("id") id: string) {
    return this.amendments.approve(user.workspaceId, id, user.userId, user.role);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Patch(ROUTES.TIMESHEETS.DENY_AMENDMENT(":id"))
  async denyAmendment(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(reviewAmendmentSchema)) body: z.infer<typeof reviewAmendmentSchema>
  ) {
    return this.amendments.deny(user.workspaceId, id, user.userId, user.role, body.adminNote);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Patch(ROUTES.TIMESHEETS.APPROVE(":id"))
  async approve(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(approveTimesheetSchema))
    body: z.infer<typeof approveTimesheetSchema>
  ) {
    return this.timesheets.approve(user.workspaceId, id, user.userId, user.role, body.reviewNote);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Patch(ROUTES.TIMESHEETS.REJECT(":id"))
  async reject(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(rejectTimesheetSchema)) body: z.infer<typeof rejectTimesheetSchema>
  ) {
    return this.timesheets.reject(user.workspaceId, id, user.userId, user.role, body.reviewNote);
  }

  @UseGuards(AdminOrProjectManagerGuard)
  @Post(ROUTES.TIMESHEETS.BULK_REVIEW)
  async bulkReview(
    @WorkspaceUser() user: WorkspaceRequestUser,
    @Body(new ZodValidationPipe(bulkReviewTimesheetSchema))
    body: z.infer<typeof bulkReviewTimesheetSchema>
  ) {
    return this.timesheets.bulkReview(
      user.workspaceId,
      user.userId,
      user.role,
      body.ids,
      body.action,
      body.reviewNote
    );
  }
}
