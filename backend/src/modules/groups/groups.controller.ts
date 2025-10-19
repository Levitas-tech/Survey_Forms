import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new group (Admin only)' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  async create(@Body() createGroupDto: CreateGroupDto, @Request() req) {
    return this.groupsService.create(createGroupDto, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all groups (Admin only)' })
  @ApiResponse({ status: 200, description: 'Groups retrieved successfully' })
  async findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get group by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Group retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update group (Admin only)' })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete group (Admin only)' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async remove(@Param('id') id: string) {
    await this.groupsService.remove(id);
    return { message: 'Group deleted successfully' };
  }

  @Post(':id/users/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add user to group (Admin only)' })
  @ApiResponse({ status: 200, description: 'User added to group successfully' })
  async addUser(@Param('id') groupId: string, @Param('userId') userId: string) {
    return this.groupsService.addUser(groupId, userId);
  }

  @Delete(':id/users/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove user from group (Admin only)' })
  @ApiResponse({ status: 200, description: 'User removed from group successfully' })
  async removeUser(@Param('id') groupId: string, @Param('userId') userId: string) {
    return this.groupsService.removeUser(groupId, userId);
  }
}
