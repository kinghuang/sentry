import EventView from 'app/views/eventsV2/eventView';
import {AUTOLINK_FIELDS} from 'app/views/eventsV2/data';

const generateFields = fields => {
  return fields.map(field => {
    return {
      field,
      title: field,
    };
  });
};

const generateSorts = sorts => {
  return sorts.map(sortName => {
    return {
      field: sortName,
      kind: 'desc',
    };
  });
};

describe('EventView.fromLocation()', function() {
  it('maps query strings', function() {
    const location = {
      query: {
        id: '42',
        name: 'best query',
        field: ['count()', 'id'],
        fieldnames: ['events', 'projects'],
        sort: ['title', '-count'],
        tag: ['foo', 'bar'],
        query: 'event.type:transaction',
        project: [123],
        start: '2019-10-01T00:00:00',
        end: '2019-10-02T00:00:00',
        statsPeriod: '14d',
        environment: 'staging',
      },
    };

    const eventView = EventView.fromLocation(location);

    expect(eventView.id).toEqual('42');
    expect(eventView.name).toEqual('best query');
    expect(eventView.fields).toEqual([
      {field: 'count()', title: 'events'},
      {field: 'id', title: 'projects'},
    ]);
    expect(eventView.sorts).toEqual([{field: 'count', kind: 'desc'}]);
    expect(eventView.tags).toEqual(['foo', 'bar']);
    expect(eventView.query).toEqual('event.type:transaction');
    expect(eventView.project).toEqual([123]);
    expect(eventView.start).toEqual('2019-10-01T00:00:00');
    expect(eventView.end).toEqual('2019-10-02T00:00:00');
    expect(eventView.statsPeriod).toEqual('14d');
    expect(eventView.environment).toEqual('staging');
  });
});

describe('EventView.fromSavedQuery()', function() {
  it('maps basic properties', function() {
    const saved = {
      id: 42,
      name: 'best query',
      fields: ['count()', 'id'],
      conditions: [['event.type', '=', 'transaction']],
      projects: [123],
      range: '14d',
      start: '2019-10-01T00:00:00',
      end: '2019-10-02T00:00:00',
      orderby: '-id',
      environment: 'staging',
    };
    const eventView = EventView.fromSavedQuery(saved);
    expect(eventView.fields).toEqual([
      {field: 'count()', title: 'count()'},
      {field: 'id', title: 'id'},
    ]);
    expect(eventView.id).toEqual(saved.id);
    expect(eventView.name).toEqual(saved.name);
    expect(eventView.query).toEqual('event.type:transaction');
    expect(eventView.project).toEqual([123]);
    expect(eventView.statsPeriod).toEqual('14d');
    expect(eventView.start).toEqual('2019-10-01T00:00:00');
    expect(eventView.end).toEqual('2019-10-02T00:00:00');
    expect(eventView.sorts).toEqual([{field: 'id', kind: 'desc'}]);
    expect(eventView.environment).toEqual('staging');
    expect(eventView.tags).toEqual([]);
  });

  it('maps equality conditions', function() {
    const saved = {
      fields: ['count()', 'id'],
      conditions: [['event.type', '=', 'error']],
    };
    const eventView = EventView.fromSavedQuery(saved);
    expect(eventView.query).toEqual('event.type:error');
  });

  it('maps properties from v2 saved query', function() {
    const saved = {
      name: 'best query',
      fields: ['count()', 'title'],
      fieldnames: ['volume', 'caption'],
      range: '14d',
      start: '',
      end: '',
    };
    const eventView = EventView.fromSavedQuery(saved);
    expect(eventView.fields).toEqual([
      {field: 'count()', title: 'volume'},
      {field: 'title', title: 'caption'},
    ]);
    expect(eventView.name).toEqual(saved.name);
    expect(eventView.statsPeriod).toEqual('14d');
    expect(eventView.start).toEqual('');
    expect(eventView.end).toEqual('');
  });
});

describe('EventView.generateQueryStringObject()', function() {
  it('skips empty values', function() {
    const eventView = new EventView({
      fields: generateFields(['id', 'title']),
      tags: [],
      sorts: [],
      project: [],
      environment: '',
      statsPeriod: '',
      start: null,
      end: undefined,
    });
    const query = eventView.generateQueryStringObject();
    expect(query.environment).toBeUndefined();
    expect(query.statsPeriod).toBeUndefined();
    expect(query.start).toBeUndefined();
    expect(query.end).toBeUndefined();
    expect(query.project).toBeUndefined();
  });

  it('encodes fields and fieldnames', function() {
    const eventView = new EventView({
      fields: [{field: 'id', title: 'ID'}, {field: 'title', title: 'Event'}],
      tags: [],
      sorts: [],
    });
    const query = eventView.generateQueryStringObject();
    expect(query.field).toEqual(['id', 'title']);
    expect(query.fieldnames).toEqual(['ID', 'Event']);
  });

  it('returns a copy of data preventing mutation', function() {
    const eventView = new EventView({
      fields: [{field: 'id', title: 'ID'}, {field: 'title', title: 'Event'}],
      tags: [],
      sorts: [],
    });
    const query = eventView.generateQueryStringObject();
    query.field.push('newthing');
    query.fieldnames.push('new thing');

    // Getting the query again should return the original values.
    const secondQuery = eventView.generateQueryStringObject();
    expect(secondQuery.field).toEqual(['id', 'title']);
    expect(secondQuery.fieldnames).toEqual(['ID', 'Event']);

    expect(query).not.toEqual(secondQuery);
  });
});

describe('EventView.getEventsAPIPayload()', function() {
  it('appends any additional conditions defined for view', function() {
    const eventView = new EventView({
      fields: generateFields(['id']),
      sorts: [],
      tags: [],
      query: 'event.type:csp',
    });

    const location = {};

    expect(eventView.getEventsAPIPayload(location).query).toEqual('event.type:csp');
  });

  it('appends query conditions in location', function() {
    const eventView = new EventView({
      fields: generateFields(['id']),
      sorts: [],
      tags: [],
      query: 'event.type:csp',
    });

    const location = {
      query: {
        query: 'TypeError',
      },
    };
    expect(eventView.getEventsAPIPayload(location).query).toEqual(
      'event.type:csp TypeError'
    );
  });

  it('does not duplicate conditions', function() {
    const eventView = new EventView({
      fields: generateFields(['id']),
      sorts: [],
      tags: [],
      query: 'event.type:csp',
    });

    const location = {
      query: {
        query: 'event.type:csp',
      },
    };
    expect(eventView.getEventsAPIPayload(location).query).toEqual('event.type:csp');
  });

  it('only includes at most one sort key', function() {
    const eventView = new EventView({
      fields: generateFields(['count()', 'title']),
      sorts: generateSorts(['title', 'count']),
      tags: [],
      query: 'event.type:csp',
    });

    const location = {
      query: {},
    };

    expect(eventView.getEventsAPIPayload(location).sort).toEqual('-title');
  });

  it('only includes sort keys that are defined in fields', function() {
    const eventView = new EventView({
      fields: generateFields(['title', 'count()']),
      sorts: generateSorts(['project', 'count']),
      tags: [],
      query: 'event.type:csp',
    });

    const location = {
      query: {},
    };

    expect(eventView.getEventsAPIPayload(location).sort).toEqual('-count');
  });
});

describe('EventView.toNewQuery()', function() {
  it('outputs the right fields', function() {
    const eventView = new EventView({
      id: '2',
      name: 'best query',
      fields: [
        {field: 'count()', title: 'count'},
        {field: 'project.id', title: 'project'},
      ],
      query: 'event.type:error',
      statsPeriod: '14d',
      start: '',
      end: '',
      sorts: [{field: 'count', kind: 'asc'}],
    });

    const output = eventView.toNewQuery();
    expect(output.fields).toEqual(['count()', 'project.id']);
    expect(output.fieldnames).toEqual(['count', 'project']);
    expect(output.name).toEqual(eventView.name);
    expect(output.range).toEqual('14d');
    expect(output.start).toEqual('');
    expect(output.end).toEqual('');
    expect(output.orderby).toEqual('count');
    expect(output.id).toEqual('2');
  });
});

describe('EventView.isValid()', function() {
  it('event view is valid when there is at least one field', function() {
    const eventView = new EventView({
      fields: [
        {field: 'count()', title: 'count'},
        {field: 'project.id', title: 'project'},
      ],
      sorts: [],
      tags: [],
      project: [],
    });

    expect(eventView.isValid()).toBe(true);
  });

  it('event view is not valid when there are no fields', function() {
    const eventView = new EventView({
      fields: [],
      sorts: [],
      tags: [],
      project: [],
    });

    expect(eventView.isValid()).toBe(false);
  });
});

describe('EventView.getFieldNames()', function() {
  it('returns field names', function() {
    const eventView = new EventView({
      fields: [
        {field: 'count()', title: 'events'},
        {field: 'project.id', title: 'project'},
      ],
      sorts: [],
      tags: [],
      project: [],
    });

    expect(eventView.getFieldNames()).toEqual(['events', 'project']);
  });
});

describe('EventView.getFields()', function() {
  it('returns fields', function() {
    const eventView = new EventView({
      fields: [
        {field: 'count()', title: 'events'},
        {field: 'project.id', title: 'project'},
      ],
      sorts: [],
      tags: [],
      project: [],
    });

    expect(eventView.getFields()).toEqual(['count()', 'project.id']);
  });
});

describe('EventView.hasAutolinkField()', function() {
  it('returns false when none of the fields are auto-linkable', function() {
    const eventView = new EventView({
      fields: [
        {field: 'count()', title: 'events'},
        {field: 'project.id', title: 'project'},
      ],
      sorts: [],
      tags: [],
      project: [],
    });

    expect(eventView.hasAutolinkField()).toEqual(false);
  });

  it('returns true when any of the fields are auto-linkable', function() {
    for (const field of AUTOLINK_FIELDS) {
      const eventView = new EventView({
        fields: generateFields([field]),
        sorts: [],
        tags: [],
        project: [],
      });

      expect(eventView.hasAutolinkField()).toEqual(true);
    }
  });
});
