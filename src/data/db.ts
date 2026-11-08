import Dexie, { type Table } from 'dexie'
import type {
  Conversation,
  DecisionRecord,
  Memory,
  ProfileVersion,
  SimilarityResult,
  UserProfile,
  UserSettings,
} from '../types'

export class DoppelDatabase extends Dexie {
  profile!: Table<UserProfile, string>
  memories!: Table<Memory, string>
  conversations!: Table<Conversation, string>
  decisions!: Table<DecisionRecord, string>
  similarities!: Table<SimilarityResult, string>
  versions!: Table<ProfileVersion, string>
  settings!: Table<UserSettings, string>

  constructor(name = 'digital-doppelganger') {
    super(name)
    this.version(1).stores({
      profile: 'id',
      memories: 'id, category, enabled, createdAt',
      conversations: 'id, updatedAt',
      decisions: 'id, category, createdAt',
      similarities: 'id, createdAt',
      versions: 'id, createdAt',
      settings: 'id',
    })
  }
}

export const db = new DoppelDatabase()
