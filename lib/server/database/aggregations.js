module.exports = {
  newerThan: (date) => [
    {
      $addFields: {
        insertDate: {
          $toDate: '$_id'
        }
      }
    }, {
      $match: {
        insertDate: {
          $gt: date
        }
      }
    }
  ],
  sortByInsertionOrderDesc: () => [
    {
      $sort: {
        _id: -1
      }
    }
  ],
  playlistUniqueBySid: () => [
    {
      $group: {
        _id: '$sid',
        oid: {
          $first: '$_id'
        }
      }
    }, {
      $addFields: {
        sid: '$_id',
        _id: '$oid'
      }
    }
  ]
}
