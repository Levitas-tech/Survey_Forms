import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../../entities/group.entity';
import { User } from '../../entities/user.entity';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createGroupDto: CreateGroupDto, userId: string): Promise<Group> {
    const group = this.groupRepository.create({
      ...createGroupDto,
      createdById: userId,
    });

    return this.groupRepository.save(group);
  }

  async findAll(): Promise<Group[]> {
    return this.groupRepository.find({
      relations: ['createdBy', 'users'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['createdBy', 'users'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async update(id: string, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.findOne(id);
    Object.assign(group, updateGroupDto);
    return this.groupRepository.save(group);
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);
    await this.groupRepository.remove(group);
  }

  async addUser(groupId: string, userId: string): Promise<Group> {
    const group = await this.findOne(groupId);
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!group.users) {
      group.users = [];
    }

    if (!group.users.find(u => u.id === userId)) {
      group.users.push(user);
      await this.groupRepository.save(group);
    }

    return this.findOne(groupId);
  }

  async removeUser(groupId: string, userId: string): Promise<Group> {
    const group = await this.findOne(groupId);

    if (group.users) {
      group.users = group.users.filter(user => user.id !== userId);
      await this.groupRepository.save(group);
    }

    return this.findOne(groupId);
  }
}
